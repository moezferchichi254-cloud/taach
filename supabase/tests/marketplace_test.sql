-- Behaviour tests for migration 2. Run with tests/run.sh. Stops at the first failure.
\set ON_ERROR_STOP 1
\set QUIET 1
create or replace function public.ok(c boolean, msg text) returns text language plpgsql as $$
begin if c is distinct from true then raise exception 'FAILED: %', msg; end if; return 'ok  ' || msg; end $$;
create or replace function public.fails(q text, pattern text, msg text) returns text language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm ~* pattern then return 'ok  ' || msg; end if;
    raise exception 'FAILED: % (wrong error: %)', msg, sqlerrm;
  end;
  raise exception 'FAILED: % (no error)', msg;
end $$;
grant execute on function public.ok(boolean, text), public.fails(text, text, text) to authenticated, anon;

-- people: A seller (admin too), B buyer, C buyer
insert into auth.users(id, phone) values
 ('00000000-0000-0000-0000-00000000000a','+21620000001'),
 ('00000000-0000-0000-0000-00000000000b','+21620000002'),
 ('00000000-0000-0000-0000-00000000000c','+21620000003');
update profiles set is_admin = true, id_verified_at = now() where id = '00000000-0000-0000-0000-00000000000a';
insert into categories(id, slug, name_fr, name_en) values ('10000000-0000-0000-0000-000000000001','vintage','Vintage','Vintage');
insert into addresses(id, user_id, full_name, phone, line1, city, governorate, is_default) values
 ('a0000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a','Amira','+216','1 rue','Tunis','Tunis',true),
 ('a0000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','Sami','+216','2 rue','Sfax','Sfax',true),
 ('a0000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000c','Leila','+216','3 rue','Sousse','Sousse',true);
insert into items(id, seller_id, title, category_id, condition, price_millimes, parcel_size, is_vintage) values
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','Veste en cuir vintage','10000000-0000-0000-0000-000000000001','good',85000,'medium',true),
 ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000a','Vinyles malouf','10000000-0000-0000-0000-000000000001','good',45000,'small',true),
 ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-00000000000a','Théière cuivre','10000000-0000-0000-0000-000000000001','good',38000,'small',true),
 ('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-00000000000a','Sac en paille','10000000-0000-0000-0000-000000000001','good',30000,'small',false);
insert into bundle_discounts values ('00000000-0000-0000-0000-00000000000a', 2, 10);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

-- privacy
select fails($$select phone from profiles limit 1$$, 'permission denied', 'phone numbers are not readable');
select ok((select username from profiles where id = '00000000-0000-0000-0000-00000000000a') is not null, 'public profile fields readable');

-- search
select ok((select count(*) from search_items('theiere', '{}')) = 1, 'search is accent-insensitive');
select ok((select count(*) from search_items('', '{"vintage_only": true}')) = 3, 'vintage filter');
select ok((select title from search_items('', '{"sort": "price_asc"}') limit 1) = 'Sac en paille', 'sort by price');

-- favourites notify the seller
select ok(toggle_favourite('20000000-0000-0000-0000-000000000001'), 'favourite on');
select ok(not toggle_favourite('20000000-0000-0000-0000-000000000001'), 'favourite off');
select ok(toggle_favourite('20000000-0000-0000-0000-000000000001'), 'favourite on again');

-- quotes: single, bundle discount, fee and shipping
select ok((quote(array['20000000-0000-0000-0000-000000000001']::uuid[], 'courier')->>'total_millimes')::bigint = 85000 + 4750 + 8000, 'single quote: item + 5% + 0.5 TND fee + medium shipping');
select ok((quote(array['20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003']::uuid[], 'courier')->>'bundle_discount_millimes')::bigint = 8300, 'bundle of 2 gets 10% off');
select fails($$select quote(array['20000000-0000-0000-0000-000000000001']::uuid[], 'drone')$$, 'delivery', 'unknown delivery refused');

-- chat: phone numbers flagged, conversation reused
select ok((start_conversation('20000000-0000-0000-0000-000000000004')).id = (start_conversation('20000000-0000-0000-0000-000000000004')).id, 'one conversation per item and buyer');
insert into messages (conversation_id, sender_id, body) select id, auth.uid(), 'Appelle-moi au 20 123 456' from conversations where item_id = '20000000-0000-0000-0000-000000000004';
select ok((select flagged from messages order by created_at desc limit 1), 'phone number in chat flagged');

-- offer -> accept -> order at the offer price
select ok((make_offer(array['20000000-0000-0000-0000-000000000004']::uuid[], 25000)).status = 'pending', 'offer made');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select ok((respond_offer((select id from offers limit 1), true)).status = 'accepted', 'seller accepts');
reset role;
select set_config('test.offer', (select id::text from offers limit 1), false) is not null as offer_saved \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select ok((select count(*) from offers) = 0, 'C cannot see B''s offer');
select fails($$select place_order(array['20000000-0000-0000-0000-000000000004']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000c', current_setting('test.offer')::uuid)$$, 'offer_not_usable', 'someone else cannot use the offer');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select fails($$select place_order(array['20000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000b', current_setting('test.offer')::uuid)$$, 'offer_not_usable', 'offer only covers its own items');
select ok((place_order(array['20000000-0000-0000-0000-000000000004']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000b', current_setting('test.offer')::uuid)).items_millimes = 25000, 'order at the accepted offer price');
select ok((select status from offers limit 1) = 'used', 'offer marked used');

-- two buyers, one item
select ok((place_order(array['20000000-0000-0000-0000-000000000001']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000b')).status = 'confirmed', 'B buys the jacket');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select fails($$select place_order(array['20000000-0000-0000-0000-000000000001']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000c')$$, 'items_unavailable', 'C cannot buy the same jacket');
select fails($$select place_order(array['20000000-0000-0000-0000-000000000002']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000b')$$, 'address_required', 'cannot ship to someone else''s address');
select fails($$select place_order(array['20000000-0000-0000-0000-000000000002']::uuid[], 'courier', 'konnect', 'a0000000-0000-0000-0000-00000000000c')$$, 'online_payment', 'online payment not open yet');
select ok((select count(*) from orders) = 0, 'C sees none of B''s orders');

-- C buys the bundle, then cancels it: items back on sale
select ok((place_order(array['20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003']::uuid[], 'hand', 'cod')).bundle_discount_millimes = 8300, 'bundle order keeps the discount');
select ok((cancel_order((select id from orders limit 1), 'changed my mind')).status = 'cancelled', 'buyer cancels before shipping');
select ok((select count(*) from search_items('', '{}') where id in ('20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')) = 2, 'cancelled items are back on sale');

-- seller ships the jacket; courier delivers; buyer confirms; seller credited (pending for COD)
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select fails($$select mark_shipped((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000001'))$$, 'cannot_ship', 'buyer cannot mark shipped');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select ok((mark_shipped((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000001'), 'TN123')).status = 'shipped', 'seller ships');
select fails($$select courier_update((select id from orders limit 1), 'delivered')$$, 'permission denied', 'users cannot fake courier events');
reset role;
select ok((courier_update((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000001'), 'delivered')).status = 'delivered', 'courier delivers (service role)');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select ok((confirm_received((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000001'))).status = 'completed', 'buyer confirms');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select ok((select pending_millimes from wallet_balances) = 85000, 'seller has 85 TND pending (COD)');
select fails($$select request_payout(85000)$$, 'no_payout_method', 'payout needs an account');
insert into payout_methods (user_id, kind, holder_name, account_ref) values (auth.uid(), 'bank_rib', 'Amira', '12345678901234567890');
select fails($$select request_payout(85000)$$, 'amount', 'pending money cannot be withdrawn');

-- admin reconciles the courier's cash, seller withdraws
select ok(admin_reconcile_cod(array(select id from orders where status = 'completed')) = 1, 'admin reconciles COD cash');
select fails($$select request_payout(90000)$$, 'amount', 'cannot withdraw more than available');
select ok((request_payout(85000)).status = 'requested', 'withdrawal requested');
select ok((select available_millimes from wallet_balances) = 0, 'balance is 0 after withdrawal');
select ok(pg_typeof(admin_mark_payout((select id from payouts limit 1), false, 'bad RIB')) = 'void'::regtype, 'admin marks the payout failed');
select ok((select status from payouts limit 1) = 'failed', 'payout status failed');
select ok((select available_millimes from wallet_balances) = 85000, 'failed payout money returns to the balance');

-- refused parcel (COD): items back on sale, seller not credited
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select ok((place_order(array['20000000-0000-0000-0000-000000000002']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000c')).status = 'confirmed', 'C orders the vinyl');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select ok((mark_shipped((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000002' and o.status = 'confirmed'))).status = 'shipped', 'shipped');
reset role;
select ok((courier_update((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000002' and o.status = 'shipped'), 'refused')).status = 'refused', 'buyer refused at the door');
select ok((select status from items where id = '20000000-0000-0000-0000-000000000002') = 'active', 'refused item back on sale');

-- claim: B buys the teapot, it arrives damaged, claim opened, admin refunds
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select ok((place_order(array['20000000-0000-0000-0000-000000000003']::uuid[], 'courier', 'cod', 'a0000000-0000-0000-0000-00000000000b')).status = 'confirmed', 'B orders the teapot');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select ok((mark_shipped((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000003' and o.status = 'confirmed'))).status = 'shipped', 'teapot shipped');
reset role;
select ok((courier_update((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000003' and o.status = 'shipped'), 'delivered')).status = 'delivered', 'teapot delivered');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select ok((open_claim((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000003' and o.status = 'delivered'), 'damaged', 'Le bec est cassé', '{}')).status = 'open', 'claim opened');
select fails($$select confirm_received((select o.id from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000003' and o.status = 'disputed'))$$, 'cannot_complete', 'disputed order cannot be completed by the buyer');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select fails($$select admin_resolve_claim((select id from claims limit 1), true, 'x')$$, 'forbidden', 'only admins resolve claims');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select ok(pg_typeof(admin_resolve_claim((select id from claims limit 1), true, 'photos clear')) = 'void'::regtype, 'admin refunds');
reset role;
select ok((select status from orders o join order_items oi on oi.order_id = o.id where oi.item_id = '20000000-0000-0000-0000-000000000003' and o.status <> 'cancelled') = 'refunded', 'order refunded');
select ok((select count(*) from ledger_entries where order_id = (select order_id from claims limit 1)) = 0, 'seller not credited on a refunded order');

-- jobs: late shipping cancelled with 1-star auto review; delivered orders auto-complete
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select ok((place_order(array['20000000-0000-0000-0000-000000000002']::uuid[], 'hand', 'cod')).status = 'confirmed', 'C orders again (hand delivery)');
reset role;
update orders set ship_by = now() - interval '1 minute' where status = 'confirmed' and buyer_id = '00000000-0000-0000-0000-00000000000c';
select ok(job_cancel_late_orders() = 1, 'late order cancelled by the job');
select ok((select count(*) from feedback where is_automatic and stars = 1) = 1, 'automatic 1-star review for the late seller');
select ok(job_expire_offers() = 0, 'expire-offers job runs');
select ok((select count(*) from notifications where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'favourite') = 2, 'seller notified of favourites');

-- deleting an account keeps orders, removes listings
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select ok(pg_typeof(delete_account()) = 'void'::regtype, 'C deletes the account');
reset role;
select ok((select deleted_at is not null and phone is null from profiles where id = '00000000-0000-0000-0000-00000000000c'), 'profile anonymised');
select ok((select count(*) from orders where buyer_id = '00000000-0000-0000-0000-00000000000c') > 0, 'orders kept for accounting');

-- storage: paths must start with your own id
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into storage.objects (bucket_id, name) values ('item-photos', '00000000-0000-0000-0000-00000000000b/x/0.jpg');
select fails($$insert into storage.objects (bucket_id, name) values ('item-photos', '00000000-0000-0000-0000-00000000000a/x/0.jpg')$$, 'row-level security', 'cannot upload into someone else''s folder');
select fails($$insert into storage.objects (bucket_id, name) values ('id-docs', '00000000-0000-0000-0000-00000000000a/front.jpg')$$, 'row-level security', 'cannot upload ID docs for someone else');
insert into storage.objects (bucket_id, name) values ('id-docs', '00000000-0000-0000-0000-00000000000b/front.jpg');
select ok((select count(*) from storage.objects where bucket_id = 'id-docs') = 0, 'users cannot read ID docs, even their own');
reset role;
\echo ALL MARKETPLACE TESTS PASSED
