-- Taach: marketplace logic (orders, money, chat, search, jobs, admin).
-- Everything that changes an order or money runs here, server side, as
-- security definer functions. The app only calls them (supabase.rpc).
-- Mirrors the demo data layer in mobile/src/data/fake.ts.

-- ---------------------------------------------------------------- pricing (placeholders: set real values before launch)

create or replace function public.buyer_fee(p_items bigint) returns bigint
  language sql immutable as $$ select (round((p_items * 0.05 + 500) / 10.0) * 10)::bigint $$;

create or replace function public.shipping_price(p_sizes text[], p_delivery text) returns bigint
  language sql immutable as $$
  select case
    when p_delivery = 'hand' then 0
    when 'large' = any(p_sizes) then 10000
    when 'medium' = any(p_sizes) then 8000
    else 7000 end::bigint
$$;

-- ---------------------------------------------------------------- notifications

create or replace function public.notify(p_user uuid, p_kind text, p_payload jsonb)
  returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, payload) values (p_user, p_kind, p_payload)
$$;
revoke execute on function public.notify(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.mark_notifications_read() returns void
  language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

-- ---------------------------------------------------------------- favourites

create or replace function public.toggle_favourite(p_item uuid) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_on boolean; v_seller uuid; v_title text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from favourites where user_id = auth.uid() and item_id = p_item;
  if found then return false; end if;
  select seller_id, title into v_seller, v_title from items where id = p_item and status in ('active','reserved');
  if v_seller is null then raise exception 'item_not_found'; end if;
  insert into favourites (user_id, item_id) values (auth.uid(), p_item);
  if v_seller <> auth.uid() then
    perform notify(v_seller, 'favourite', jsonb_build_object('item_id', p_item, 'title', v_title));
  end if;
  return true;
end $$;

-- ---------------------------------------------------------------- search

create or replace function public.search_items(
  p_query text default '', p_filters jsonb default '{}', p_limit int default 40, p_offset int default 0
) returns setof public.items
  language sql stable security invoker set search_path = public as $$
  select i.* from items i
  join profiles p on p.id = i.seller_id and not p.holiday_mode and p.banned_at is null
  where i.status in ('active','reserved')
    and (coalesce(p_query,'') = '' or i.search_vector @@ plainto_tsquery('simple', f_unaccent(p_query))
         or f_unaccent(lower(i.title)) % f_unaccent(lower(p_query)))
    and (p_filters->>'category_id' is null or i.category_id = (p_filters->>'category_id')::uuid)
    and (coalesce((p_filters->>'vintage_only')::boolean, false) = false or i.is_vintage)
    and (p_filters->'conditions' is null or jsonb_array_length(p_filters->'conditions') = 0
         or i.condition in (select jsonb_array_elements_text(p_filters->'conditions')))
    and (p_filters->'sizes' is null or jsonb_array_length(p_filters->'sizes') = 0
         or exists (select 1 from sizes s where s.id = i.size_id and s.label in (select jsonb_array_elements_text(p_filters->'sizes'))))
    and (p_filters->>'min_millimes' is null or i.price_millimes >= (p_filters->>'min_millimes')::bigint)
    and (p_filters->>'max_millimes' is null or i.price_millimes <= (p_filters->>'max_millimes')::bigint)
  order by
    (i.bumped_until is not null and i.bumped_until > now()) desc,
    case when p_filters->>'sort' = 'price_asc' then i.price_millimes end asc,
    case when p_filters->>'sort' = 'price_desc' then i.price_millimes end desc,
    i.created_at desc
  limit least(p_limit, 100) offset p_offset
$$;

-- ---------------------------------------------------------------- chat

create or replace function public.start_conversation(p_item uuid) returns public.conversations
  language plpgsql security definer set search_path = public as $$
declare v_seller uuid; c conversations;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select seller_id into v_seller from items where id = p_item and status <> 'removed';
  if v_seller is null then raise exception 'item_not_found'; end if;
  if v_seller = auth.uid() then raise exception 'own_item'; end if;
  if is_blocked_between(auth.uid(), v_seller) then raise exception 'blocked'; end if;
  insert into conversations (item_id, buyer_id, seller_id, buyer_read_at)
    values (p_item, auth.uid(), v_seller, now())
    on conflict (item_id, buyer_id) where item_id is not null do update set item_id = excluded.item_id
    returning * into c;
  return c;
end $$;

-- Every message: flag off-app contact, bump the conversation, notify the other side.
create or replace function public.on_message() returns trigger
  language plpgsql security definer set search_path = public as $$
declare c conversations; v_other uuid;
begin
  if new.kind = 'text' and new.body ~* '(\+?216)?[ .-]?[0-9]{2}[ .-]?[0-9]{3}[ .-]?[0-9]{3}|@[a-z0-9-]+\.[a-z]{2,}|whatsapp|virement|d17|hors (de l.)?app|outside the app' then
    new.flagged := true;
  end if;
  select * into c from conversations where id = new.conversation_id;
  update conversations set last_message_at = now(),
    buyer_read_at = case when new.sender_id = c.buyer_id then now() else buyer_read_at end,
    seller_read_at = case when new.sender_id = c.seller_id then now() else seller_read_at end
    where id = c.id;
  if new.sender_id is not null and new.kind = 'text' then
    v_other := case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end;
    perform notify(v_other, 'message', jsonb_build_object('conversation_id', c.id,
      'from', (select username from profiles where id = new.sender_id)));
  end if;
  return new;
end $$;
create trigger messages_on_insert before insert on public.messages
  for each row execute function public.on_message();

create or replace function public.mark_conversation_read(p_conversation uuid) returns void
  language sql security definer set search_path = public as $$
  update conversations set
    buyer_read_at = case when buyer_id = auth.uid() then now() else buyer_read_at end,
    seller_read_at = case when seller_id = auth.uid() then now() else seller_read_at end
  where id = p_conversation and auth.uid() in (buyer_id, seller_id)
$$;

-- Offers notify the other side (make_offer / respond_offer live in the first migration).
create or replace function public.on_offer() returns trigger
  language plpgsql security definer set search_path = public as $$
declare c conversations;
begin
  select * into c from conversations where id = new.conversation_id;
  if tg_op = 'INSERT' then
    perform notify(case when new.from_user_id = c.buyer_id then c.seller_id else c.buyer_id end,
      'offer', jsonb_build_object('conversation_id', c.id, 'status', 'new'));
  elsif new.status in ('accepted','declined') and old.status = 'pending' then
    perform notify(new.from_user_id, 'offer', jsonb_build_object('conversation_id', c.id, 'status', new.status));
  end if;
  return null;
end $$;
create trigger offers_notify after insert or update of status on public.offers
  for each row execute function public.on_offer();

-- ---------------------------------------------------------------- F03 / F05 buy

-- One item, a bundle from one seller, or an accepted offer. Read-only.
create or replace function public.quote(p_items uuid[], p_delivery text, p_offer uuid default null) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_list bigint; v_seller uuid; v_sizes text[]; v_count int; v_items bigint; v_disc bigint := 0; v_net bigint;
  v_ship bigint; v_fee bigint; o offers; v_pct int;
begin
  if p_delivery not in ('courier','hand') then raise exception 'delivery'; end if;
  select sum(price_millimes), min(seller_id::text)::uuid, array_agg(parcel_size), count(*), count(distinct seller_id)
    into v_list, v_seller, v_sizes, v_count, v_pct
    from items where id = any(p_items) and status = 'active';
  if v_count is null or v_count <> cardinality(p_items) then raise exception 'items_unavailable'; end if;
  if v_pct <> 1 then raise exception 'one_seller_only'; end if;
  if p_offer is not null then
    select o2.* into o from offers o2 join conversations c on c.id = o2.conversation_id
      where o2.id = p_offer and o2.status = 'accepted' and c.buyer_id = auth.uid()
        and o2.item_ids @> p_items and o2.item_ids <@ p_items;
    if o.id is null then raise exception 'offer_not_usable'; end if;
    v_items := o.amount_millimes;
  else
    v_items := v_list;
    select percent into v_pct from bundle_discounts
      where seller_id = v_seller and min_items <= v_count order by percent desc limit 1;
    if v_pct is not null then v_disc := (round(v_list * v_pct / 100.0 / 10) * 10)::bigint; end if;
  end if;
  v_net := v_items - v_disc;
  v_ship := shipping_price(v_sizes, p_delivery);
  v_fee := buyer_fee(v_net);
  return jsonb_build_object('items_millimes', v_items, 'bundle_discount_millimes', v_disc,
    'buyer_fee_millimes', v_fee, 'shipping_millimes', v_ship, 'total_millimes', v_net + v_fee + v_ship);
end $$;

create or replace function public.place_order(
  p_items uuid[], p_delivery text, p_payment text, p_address uuid default null, p_offer uuid default null
) returns public.orders
  language plpgsql security definer set search_path = public as $$
declare q jsonb; v_seller uuid; a addresses; o orders; v_titles text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_payment <> 'cod' then raise exception 'online_payment_not_available_yet'; end if;
  -- lock the items so two buyers can't both pass the checks
  perform 1 from items where id = any(p_items) for update;
  q := quote(p_items, p_delivery, p_offer);
  select seller_id into v_seller from items where id = p_items[1];
  if v_seller = auth.uid() then raise exception 'own_item'; end if;
  if is_blocked_between(auth.uid(), v_seller) then raise exception 'blocked'; end if;
  if p_delivery = 'courier' then
    select * into a from addresses where id = p_address and user_id = auth.uid();
    if a.id is null then raise exception 'address_required'; end if;
  end if;

  insert into orders (buyer_id, seller_id, offer_id, items_millimes, bundle_discount_millimes, buyer_fee_millimes,
                      shipping_millimes, total_millimes, payment_method, delivery_method, shipping_address,
                      status, confirmed_at, ship_by)
  values (auth.uid(), v_seller, p_offer, (q->>'items_millimes')::bigint, (q->>'bundle_discount_millimes')::bigint,
          (q->>'buyer_fee_millimes')::bigint, (q->>'shipping_millimes')::bigint, (q->>'total_millimes')::bigint,
          p_payment, p_delivery, case when a.id is null then null else to_jsonb(a) - 'user_id' end,
          'confirmed', now(), now() + interval '5 days')
  returning * into o;

  insert into order_items (order_id, item_id, price_millimes, title)
    select o.id, i.id, i.price_millimes, i.title from items i where i.id = any(p_items);
  update items set status = 'reserved' where id = any(p_items);
  if p_offer is not null then update offers set status = 'used' where id = p_offer; end if;
  if p_payment = 'cod' then
    insert into payments (order_id, provider, amount_millimes, status) values (o.id, 'cod', o.total_millimes, 'initiated');
  end if;
  perform notify(v_seller, 'order_update', jsonb_build_object('order_id', o.id, 'number', o.number, 'event', 'sold'));
  return o;
end $$;

create or replace function public.release_items(p_order uuid) returns void
  language sql security definer set search_path = public as $$
  update order_items set is_active = false where order_id = p_order;
  update items set status = 'active' where id in (select item_id from order_items where order_id = p_order) and status = 'reserved';
$$;
revoke execute on function public.release_items(uuid) from public, anon, authenticated;

create or replace function public.cancel_order(p_order uuid, p_reason text) returns public.orders
  language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 200)
    where id = p_order and status = 'confirmed' and auth.uid() in (buyer_id, seller_id)
    returning * into o;
  if o.id is null then raise exception 'cannot_cancel'; end if;
  perform release_items(o.id);
  perform notify(case when auth.uid() = o.buyer_id then o.seller_id else o.buyer_id end,
    'order_update', jsonb_build_object('order_id', o.id, 'number', o.number, 'event', 'cancelled'));
  return o;
end $$;

-- ---------------------------------------------------------------- F06 ship + courier updates

-- Seller hands the parcel to the courier. With a real courier API, the Edge
-- Function `book-pickup` creates the shipment instead and calls courier_update.
create or replace function public.mark_shipped(p_order uuid, p_tracking text default null) returns public.orders
  language plpgsql security definer set search_path = public as $$
declare o orders; v_from jsonb;
begin
  update orders set status = 'shipped', shipped_at = now()
    where id = p_order and seller_id = auth.uid() and status = 'confirmed' returning * into o;
  if o.id is null then raise exception 'cannot_ship'; end if;
  if o.delivery_method = 'courier' then
    select to_jsonb(a) - 'user_id' into v_from from addresses a where a.user_id = o.seller_id order by is_default desc limit 1;
    insert into shipments (order_id, carrier, pickup_address, tracking_number, cod_amount_millimes, status)
      values (o.id, 'manual', coalesce(v_from, '{}'), p_tracking,
              case when o.payment_method = 'cod' then o.total_millimes else 0 end, 'picked_up');
  end if;
  perform notify(o.buyer_id, 'order_update', jsonb_build_object('order_id', o.id, 'number', o.number, 'event', 'shipped'));
  return o;
end $$;

-- Courier events (webhook or polling, service role only). COD 'delivered' means cash collected.
create or replace function public.courier_update(p_order uuid, p_status text, p_description text default null, p_raw jsonb default '{}')
  returns public.orders
  language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'order_not_found'; end if;
  update shipments set status = p_status where order_id = o.id;
  insert into shipment_events (shipment_id, status, description, occurred_at, raw)
    select s.id, p_status, p_description, now(), p_raw from shipments s where s.order_id = o.id;
  if p_status = 'delivered' and o.status = 'shipped' then
    update orders set status = 'delivered', delivered_at = now(), completes_at = now() + interval '2 days'
      where id = o.id returning * into o;
    update payments set status = 'collected' where order_id = o.id and provider = 'cod';
    perform notify(o.buyer_id, 'order_update', jsonb_build_object('order_id', o.id, 'number', o.number, 'event', 'delivered'));
  elsif p_status = 'refused' and o.status = 'shipped' then
    update orders set status = 'refused' where id = o.id returning * into o;
    perform release_items(o.id);
    perform notify(o.seller_id, 'order_update', jsonb_build_object('order_id', o.id, 'number', o.number, 'event', 'refused'));
  end if;
  return o;
end $$;
revoke execute on function public.courier_update(uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- F08 claims

create or replace function public.open_claim(p_order uuid, p_reason text, p_description text, p_photos text[] default '{}')
  returns public.claims
  language plpgsql security definer set search_path = public as $$
declare o orders; c claims;
begin
  select * into o from orders where id = p_order and buyer_id = auth.uid() for update;
  if o.id is null then raise exception 'cannot_claim'; end if;
  if not ((o.status = 'delivered' and o.completes_at > now()) or (p_reason = 'not_received' and o.status = 'shipped')) then
    raise exception 'claim_window_closed';
  end if;
  insert into claims (order_id, opened_by, reason, description, photo_paths)
    values (o.id, auth.uid(), p_reason, p_description, coalesce(p_photos, '{}')) returning * into c;
  update orders set status = 'disputed' where id = o.id;
  perform notify(o.seller_id, 'claim', jsonb_build_object('order_id', o.id, 'number', o.number));
  return c;
end $$;

-- ---------------------------------------------------------------- F09 money

create or replace function public.request_payout(p_amount bigint) returns public.payouts
  language plpgsql security definer set search_path = public as $$
declare v_method uuid; v_available bigint; p payouts;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  -- one payout request at a time per user
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if (select id_verified_at from profiles where id = auth.uid()) is null then raise exception 'id_not_verified'; end if;
  select id into v_method from payout_methods where user_id = auth.uid() order by is_default desc, created_at desc limit 1;
  if v_method is null then raise exception 'no_payout_method'; end if;
  select coalesce(sum(amount_millimes), 0) into v_available from ledger_entries where user_id = auth.uid() and state = 'available';
  if p_amount <= 0 or p_amount > v_available then raise exception 'amount'; end if;
  insert into payouts (user_id, payout_method_id, amount_millimes) values (auth.uid(), v_method, p_amount) returning * into p;
  insert into ledger_entries (user_id, payout_id, kind, amount_millimes, state, available_at)
    values (auth.uid(), p.id, 'payout', -p_amount, 'available', now());
  return p;
end $$;

-- the ledger's unique (order_id, kind) must not block several payouts (order_id null): it doesn't, nulls are distinct.

-- ---------------------------------------------------------------- account

-- Listings removed, profile anonymised; orders, ledger and payouts are kept (accounting).
create or replace function public.delete_account() returns void
  language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from orders where auth.uid() in (buyer_id, seller_id)
             and status in ('confirmed','shipped','delivered','disputed')) then
    raise exception 'open_orders';
  end if;
  update items set status = 'removed' where seller_id = auth.uid() and status <> 'sold';
  delete from addresses where user_id = auth.uid();
  delete from payout_methods where user_id = auth.uid();
  delete from push_tokens where user_id = auth.uid();
  delete from saved_searches where user_id = auth.uid();
  update profiles set username = 'deleted_' || right(replace(id::text, '-', ''), 12), display_name = null,
    avatar_path = null, bio = null, phone = null, city = null, deleted_at = now()
    where id = auth.uid();
  -- the auth user itself is deleted by the Edge Function `delete-account` (service role)
end $$;

-- ---------------------------------------------------------------- admin (is_admin users, from the web admin)

create or replace function public.admin_approve_id(p_user uuid, p_approve boolean, p_reason text default null) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update id_verifications set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = p_reason
    where user_id = p_user and status = 'pending';
  if p_approve then update profiles set id_verified_at = now() where id = p_user; end if;
  perform notify(p_user, 'id_check', jsonb_build_object('approved', p_approve));
end $$;

-- The courier transferred the cash for these orders: seller money becomes available.
create or replace function public.admin_reconcile_cod(p_orders uuid[]) returns int
  language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update payments set status = 'remitted' where order_id = any(p_orders) and provider = 'cod' and status = 'collected';
  update ledger_entries set state = 'available', available_at = now()
    where order_id = any(p_orders) and kind = 'sale' and state = 'pending';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.admin_mark_payout(p_payout uuid, p_paid boolean, p_reference text) returns void
  language plpgsql security definer set search_path = public as $$
declare p payouts;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update payouts set status = case when p_paid then 'paid' else 'failed' end, reference = p_reference,
    paid_at = case when p_paid then now() end, processed_by = auth.uid()
    where id = p_payout and status in ('requested','processing') returning * into p;
  if p.id is null then raise exception 'payout_not_open'; end if;
  if not p_paid then -- give the money back to the balance
    insert into ledger_entries (user_id, payout_id, kind, amount_millimes, state, available_at)
      values (p.user_id, p.id, 'adjustment', p.amount_millimes, 'available', now());
  end if;
  perform notify(p.user_id, 'payout', jsonb_build_object('payout_id', p.id, 'paid', p_paid));
end $$;

-- refund = buyer gets money back (online payments) / nothing collected (COD refused); seller not credited
create or replace function public.admin_resolve_claim(p_claim uuid, p_refund boolean, p_note text) returns void
  language plpgsql security definer set search_path = public as $$
declare c claims; o orders;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update claims set status = case when p_refund then 'refunded' else 'rejected' end, resolution_note = p_note,
    resolved_by = auth.uid(), resolved_at = now() where id = p_claim and status not in ('refunded','rejected') returning * into c;
  if c.id is null then raise exception 'claim_closed'; end if;
  if p_refund then
    update orders set status = 'refunded' where id = c.order_id returning * into o;
    update order_items set is_active = false where order_id = o.id;
  else
    update orders set status = 'delivered' where id = c.order_id returning * into o;
    perform complete_order(o.id);
  end if;
  perform notify(o.buyer_id, 'claim', jsonb_build_object('order_id', o.id, 'refunded', p_refund));
  perform notify(o.seller_id, 'claim', jsonb_build_object('order_id', o.id, 'refunded', p_refund));
end $$;

-- ---------------------------------------------------------------- jobs (pg_cron, see the bottom)

create or replace function public.job_expire_offers() returns int
  language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update offers set status = 'expired' where status = 'pending' and expires_at < now();
  get diagnostics n = row_count; return n;
end $$;

-- Seller didn't ship in time: cancel, unlock the items, automatic 1-star review.
create or replace function public.job_cancel_late_orders() returns int
  language plpgsql security definer set search_path = public as $$
declare o orders; n int := 0;
begin
  for o in select * from orders where status = 'confirmed' and ship_by < now() for update skip locked loop
    update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = 'not_shipped_in_time' where id = o.id;
    perform release_items(o.id);
    insert into feedback (order_id, from_user_id, to_user_id, role, stars, is_automatic)
      values (o.id, null, o.seller_id, 'buyer_to_seller', 1, true) on conflict (order_id, role) do nothing;
    perform notify(o.buyer_id, 'order_update', jsonb_build_object('order_id', o.id, 'number', o.number, 'event', 'cancelled_late'));
    perform notify(o.seller_id, 'order_update', jsonb_build_object('order_id', o.id, 'number', o.number, 'event', 'cancelled_late'));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.job_auto_complete() returns int
  language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from orders where status = 'delivered' and completes_at < now() for update skip locked loop
    perform complete_order(r.id); n := n + 1;
  end loop;
  return n;
end $$;

-- 4 days after completion with no buyer review: automatic 5-star review.
create or replace function public.job_auto_feedback() returns int
  language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into feedback (order_id, from_user_id, to_user_id, role, stars, is_automatic)
    select o.id, null, o.seller_id, 'buyer_to_seller', 5, true from orders o
    where o.status = 'completed' and o.completed_at < now() - interval '4 days'
    on conflict (order_id, role) do nothing;
  get diagnostics n = row_count; return n;
end $$;

-- complete_order also notifies the seller
create or replace function public.on_order_completed() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform notify(new.seller_id, 'order_update', jsonb_build_object('order_id', new.id, 'number', new.number, 'event', 'completed'));
  end if;
  return null;
end $$;
create trigger orders_completed after update of status on public.orders
  for each row execute function public.on_order_completed();

-- ---------------------------------------------------------------- grants

do $$
declare f text;
begin
  foreach f in array array[
    'mark_notifications_read()', 'toggle_favourite(uuid)', 'search_items(text, jsonb, int, int)',
    'start_conversation(uuid)', 'mark_conversation_read(uuid)', 'quote(uuid[], text, uuid)',
    'place_order(uuid[], text, text, uuid, uuid)', 'cancel_order(uuid, text)', 'mark_shipped(uuid, text)',
    'open_claim(uuid, text, text, text[])', 'request_payout(bigint)', 'delete_account()',
    'admin_approve_id(uuid, boolean, text)', 'admin_reconcile_cod(uuid[])', 'admin_mark_payout(uuid, boolean, text)',
    'admin_resolve_claim(uuid, boolean, text)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['job_expire_offers()', 'job_cancel_late_orders()', 'job_auto_complete()', 'job_auto_feedback()']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------- realtime + schedule (only where available)

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.offers, public.conversations,
      public.notifications, public.orders;
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-offers', '*/15 * * * *', 'select public.job_expire_offers()');
    perform cron.schedule('cancel-late-orders', '7 * * * *', 'select public.job_cancel_late_orders()');
    perform cron.schedule('auto-complete', '17 * * * *', 'select public.job_auto_complete()');
    perform cron.schedule('auto-feedback', '27 3 * * *', 'select public.job_auto_feedback()');
  end if;
end $$;

-- ---------------------------------------------------------------- privacy: phone numbers are never public

revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_path, bio, governorate, city, locale, rating_avg, rating_count,
              id_verified_at, holiday_mode, is_admin, banned_at, deleted_at, created_at, updated_at)
  on public.profiles to anon, authenticated;
