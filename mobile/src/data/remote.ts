// Supabase data layer. Same functions as fake.ts; screens don't change.
// Reads go into the shared store (useStore + selectors from fake.ts), refreshed
// after each action and on realtime events. Writes go through the database
// functions in supabase/migrations (rules enforced server side).

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { notificationHref, notificationText } from '../lib/notificationText';
import { ApiError, hydrate, readStore, type State } from './fake';
import type {
  Address, AppNotification, ClaimReason, DeliveryMethod, Item, NewItem, Offer, Order, PaymentMethod, Photo,
  PayoutMethod, Profile, Quote, ReportTarget, SearchFilters,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const db = () => {
  if (!supabase) throw new ApiError('backend_not_configured');
  return supabase;
};
const me = () => {
  const id = readStore().me;
  if (!id) throw new ApiError('not_signed_in');
  return id;
};
/** Database errors come back as `raise exception 'code'`: keep the code as the message. */
function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new ApiError(res.error.message.replace(/^.*?:\s*/, '') || res.error.message);
  return res.data as NonNullable<T>; // null only for functions returning nothing, whose result is unused
}
const publicUrl = (path: string) => db().storage.from('item-photos').getPublicUrl(path).data.publicUrl;

// ---------------------------------------------------------------- mapping rows -> app types

const mapProfile = (r: Row): Profile => ({
  id: r.id, username: r.username, displayName: r.display_name ?? r.username, bio: r.bio ?? '', governorate: r.governorate ?? '',
  city: r.city ?? '', ratingAvg: Number(r.rating_avg ?? 0), ratingCount: r.rating_count ?? 0, idVerified: !!r.id_verified_at,
  holidayMode: !!r.holiday_mode, createdAt: r.created_at,
});
const mapItem = (r: Row): Item => ({
  id: r.id, sellerId: r.seller_id, title: r.title, description: r.description ?? '', categoryId: r.category_id,
  brand: r.brands?.name ?? null, size: r.sizes?.label ?? null, condition: r.condition, isVintage: r.is_vintage,
  era: r.attributes?.era ?? null, priceMillimes: Number(r.price_millimes), parcelSize: r.parcel_size, status: r.status,
  photos: (r.item_photos ?? []).sort((a: Row, b: Row) => a.position - b.position).map((p: Row): Photo => ({ uri: publicUrl(p.storage_path) })),
  favouriteCount: r.favourite_count ?? 0, createdAt: r.created_at,
});
const mapAddress = (r: Row): Address => ({
  id: r.id, userId: r.user_id, fullName: r.full_name, phone: r.phone, line1: r.line1, city: r.city, governorate: r.governorate, postcode: r.postcode ?? undefined,
});
const mapOrder = (r: Row): Order => ({
  id: r.id, number: r.number, buyerId: r.buyer_id, sellerId: r.seller_id, itemIds: (r.order_items ?? []).map((x: Row) => x.item_id),
  itemsMillimes: Number(r.items_millimes), bundleDiscountMillimes: Number(r.bundle_discount_millimes), buyerFeeMillimes: Number(r.buyer_fee_millimes),
  shippingMillimes: Number(r.shipping_millimes), totalMillimes: Number(r.total_millimes), paymentMethod: r.payment_method,
  deliveryMethod: r.delivery_method, shippingAddress: r.shipping_address ? mapAddress({ ...r.shipping_address, user_id: r.buyer_id }) : null,
  status: r.status, createdAt: r.created_at, confirmedAt: r.confirmed_at, shipBy: r.ship_by, shippedAt: r.shipped_at,
  deliveredAt: r.delivered_at, completesAt: r.completes_at, completedAt: r.completed_at,
  trackingNumber: r.shipments?.[0]?.tracking_number ?? r.shipments?.tracking_number ?? null, offerId: r.offer_id, cancelReason: r.cancel_reason,
});
const mapOffer = (r: Row): Offer => ({
  id: r.id, conversationId: r.conversation_id, fromUserId: r.from_user_id, itemIds: r.item_ids, listPriceMillimes: Number(r.list_price_millimes),
  amountMillimes: Number(r.amount_millimes), parentOfferId: r.parent_offer_id, status: r.status, expiresAt: r.expires_at, createdAt: r.created_at,
});
const mapNotification = (r: Row): AppNotification => ({
  id: r.id, userId: r.user_id, kind: r.kind, text: notificationText(r.kind, r.payload ?? {}), href: notificationHref(r.payload ?? {}),
  readAt: r.read_at, createdAt: r.created_at,
});

// ---------------------------------------------------------------- loading

const ITEM_COLS = '*, brands(name), sizes(label), item_photos(storage_path, position)';

/** Load everything the signed-in user can see into the store. Cheap enough for launch volumes; paginate later. */
export async function refresh() {
  const uid = readStore().me;
  const c = db();
  const [profiles, cats, items, bundles, feedback] = await Promise.all([
    c.from('profiles').select('*').limit(1000),
    c.from('categories').select('*').eq('is_active', true).order('position'),
    c.from('items').select(ITEM_COLS).in('status', ['active', 'reserved', 'sold', 'hidden']).order('created_at', { ascending: false }).limit(500),
    c.from('bundle_discounts').select('*'),
    c.from('feedback').select('*').order('created_at', { ascending: false }).limit(1000),
  ]);
  const next: Partial<State> = {
    profiles: check(profiles).map(mapProfile),
    categories: check(cats).map((r: Row) => ({ id: r.id, slug: r.slug, nameFr: r.name_fr, nameEn: r.name_en, parentId: r.parent_id })),
    items: check(items).map(mapItem),
    bundleDiscounts: check(bundles).map((r: Row) => ({ sellerId: r.seller_id, minItems: r.min_items, percent: r.percent })),
    feedback: check(feedback).map((r: Row) => ({ id: r.id, orderId: r.order_id, fromUserId: r.from_user_id, toUserId: r.to_user_id, role: r.role, stars: r.stars, body: r.body, isAutomatic: r.is_automatic, createdAt: r.created_at })),
  };
  if (uid) {
    const [addr, orders, ledger, favs, convs, msgs, offers, notifs, saved, claims, methods, payouts, idv, blocks] = await Promise.all([
      c.from('addresses').select('*').eq('user_id', uid),
      c.from('orders').select('*, order_items(item_id), shipments(tracking_number)').order('created_at', { ascending: false }),
      c.from('ledger_entries').select('*').order('created_at'),
      c.from('favourites').select('item_id').eq('user_id', uid),
      c.from('conversations').select('*').order('last_message_at', { ascending: false }),
      c.from('messages').select('*').order('created_at').limit(2000),
      c.from('offers').select('*'),
      c.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
      c.from('saved_searches').select('*').eq('user_id', uid),
      c.from('claims').select('*'),
      c.from('payout_methods').select('*').eq('user_id', uid),
      c.from('payouts').select('*').order('requested_at', { ascending: false }),
      c.from('id_verifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1),
      c.from('blocks').select('*'),
    ]);
    Object.assign(next, {
      addresses: check(addr).map(mapAddress),
      orders: check(orders).map(mapOrder),
      ledger: check(ledger).map((r: Row) => ({ id: r.id, userId: r.user_id, orderId: r.order_id, payoutId: r.payout_id ?? undefined, kind: r.kind, amountMillimes: Number(r.amount_millimes), state: r.state })),
      favourites: check(favs).map((r: Row) => ({ userId: uid, itemId: r.item_id })),
      conversations: check(convs).map((r: Row) => ({ id: r.id, itemId: r.item_id, buyerId: r.buyer_id, sellerId: r.seller_id, lastMessageAt: r.last_message_at, buyerReadAt: r.buyer_read_at, sellerReadAt: r.seller_read_at })),
      messages: check(msgs).map((r: Row) => ({
        id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, kind: r.kind,
        body: r.kind === 'system' ? (r.payload?.status === 'accepted' ? 'offer_accepted' : r.payload?.status === 'declined' ? 'offer_declined' : 'order_placed') : r.body,
        offerId: r.payload?.offer_id, orderId: r.payload?.order_id, flagged: r.flagged, createdAt: r.created_at,
      })),
      offers: check(offers).map(mapOffer),
      notifications: check(notifs).map(mapNotification),
      savedSearches: check(saved).map((r: Row) => ({ id: r.id, userId: r.user_id, query: r.query ?? '', filters: r.filters ?? {}, alertsOn: r.alerts_on, createdAt: r.created_at })),
      claims: check(claims).map((r: Row) => ({ id: r.id, orderId: r.order_id, openedBy: r.opened_by, reason: r.reason, description: r.description, photos: [], status: r.status, createdAt: r.created_at })),
      payoutMethods: check(methods).map((r: Row) => ({ id: r.id, userId: r.user_id, kind: r.kind, holderName: r.holder_name, accountRef: r.account_ref })),
      payouts: check(payouts).map((r: Row) => ({ id: r.id, userId: r.user_id, amountMillimes: Number(r.amount_millimes), methodId: r.payout_method_id, status: r.status, requestedAt: r.requested_at })),
      idVerifications: check(idv).map((r: Row) => ({ userId: r.user_id, status: r.status, createdAt: r.created_at })),
      blocks: check(blocks).map((r: Row) => ({ blockerId: r.blocker_id, blockedId: r.blocked_id })),
    });
  }
  hydrate(next);
}

/** Wrap an action: run it, then reload. */
async function act<T>(fn: () => Promise<T>): Promise<T> {
  const out = await fn();
  await refresh();
  return out;
}

let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
function listen() {
  channel?.unsubscribe();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const later = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { refresh().catch(() => {}); }, 300); };
  channel = db().channel('taach-live');
  for (const table of ['messages', 'offers', 'notifications', 'orders', 'conversations']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, later);
  }
  channel.subscribe();
}

// ---------------------------------------------------------------- auth

export async function sendPhoneCode(phone: string) {
  check(await db().auth.signInWithOtp({ phone }));
}

export async function signInWithPhone(phone: string, code: string) {
  const res = check(await db().auth.verifyOtp({ phone, token: code, type: 'sms' }));
  hydrate({ me: res.user?.id ?? null });
  await refresh();
  listen();
  registerPush().catch(() => {});
}

/** Restore a saved session at app start. */
export async function restoreSession() {
  const { data } = await db().auth.getSession();
  hydrate({ me: data.session?.user.id ?? null });
  // don't hold the first screen on the network: load in the background
  refresh().catch(() => {});
  if (data.session) { listen(); registerPush().catch(() => {}); }
}

export function signInAs(_userId: string) { /* demo only */ }

export function signOut() {
  channel?.unsubscribe();
  db().auth.signOut().catch(() => {});
  hydrate({ me: null });
}

async function registerPush() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await db().from('push_tokens').upsert({ token, user_id: me(), platform: Platform.OS === 'ios' ? 'ios' : 'android' });
}

// ---------------------------------------------------------------- items

async function uploadPhoto(bucket: string, path: string, uri: string) {
  const blob = await (await fetch(uri)).blob();
  check(await db().storage.from(bucket).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true }));
  return path;
}

export async function createItem(input: NewItem): Promise<Item> {
  const uid = me();
  const c = db();
  const brandId = input.brand ? (await c.from('brands').select('id').eq('name', input.brand).maybeSingle()).data?.id ?? null : null;
  const sizeId = input.size ? (await c.from('sizes').select('id').eq('label', input.size).limit(1).maybeSingle()).data?.id ?? null : null;
  const row = check(await c.from('items').insert({
    seller_id: uid, title: input.title, description: input.description, category_id: input.categoryId, brand_id: brandId, size_id: sizeId,
    condition: input.condition, is_vintage: input.isVintage, attributes: input.era ? { era: input.era } : {},
    price_millimes: input.priceMillimes, parcel_size: input.parcelSize, status: 'draft',
  }).select('id').single());
  const paths = await Promise.all(input.photos.map((p, i) => uploadPhoto('item-photos', `${uid}/${row.id}/${i}.jpg`, p.uri!)));
  check(await c.from('item_photos').insert(paths.map((path, i) => ({ item_id: row.id, storage_path: path, position: i }))));
  check(await c.from('items').update({ status: 'active' }).eq('id', row.id));
  await refresh();
  return readStore().items.find((i) => i.id === row.id)!;
}

export const setItemHidden = (itemId: string, hidden: boolean) =>
  act(async () => check(await db().from('items').update({ status: hidden ? 'hidden' : 'active' }).eq('id', itemId)));
export const deleteItem = (itemId: string) =>
  act(async () => check(await db().from('items').update({ status: 'removed' }).eq('id', itemId)));

// ---------------------------------------------------------------- favourites, search

export function toggleFavourite(itemId: string) {
  act(async () => check(await db().rpc('toggle_favourite', { p_item: itemId }))).catch(() => {});
}
export const saveSearch = (query: string, filters: SearchFilters) =>
  act(async () => check(await db().from('saved_searches').insert({ user_id: me(), query, filters })));
export function toggleSearchAlerts(id: string) {
  const s = readStore().savedSearches.find((x) => x.id === id);
  act(async () => check(await db().from('saved_searches').update({ alerts_on: !s?.alertsOn }).eq('id', id))).catch(() => {});
}
export function deleteSavedSearch(id: string) {
  act(async () => check(await db().from('saved_searches').delete().eq('id', id))).catch(() => {});
}

// ---------------------------------------------------------------- chat & offers

export const startConversation = (itemId: string) =>
  act(async () => {
    const r = check(await db().rpc('start_conversation', { p_item: itemId })) as Row;
    return { id: r.id, itemId: r.item_id, buyerId: r.buyer_id, sellerId: r.seller_id, lastMessageAt: r.last_message_at, buyerReadAt: r.buyer_read_at, sellerReadAt: r.seller_read_at };
  });
export const sendMessage = (conversationId: string, body: string) =>
  act(async () => { if (body.trim()) check(await db().from('messages').insert({ conversation_id: conversationId, sender_id: me(), kind: 'text', body: body.trim().slice(0, 2000) })); });
export function markConversationRead(conversationId: string) {
  const c = readStore().conversations.find((x) => x.id === conversationId);
  const uid = readStore().me;
  const readAt = c && (c.buyerId === uid ? c.buyerReadAt : c.sellerReadAt);
  const last = readStore().messages.filter((m) => m.conversationId === conversationId).at(-1);
  if (readAt && (!last || last.createdAt <= readAt)) return; // nothing new: no loop
  act(async () => check(await db().rpc('mark_conversation_read', { p_conversation: conversationId }))).catch(() => {});
}
export const makeOffer = (itemIds: string[], amountMillimes: number, parentOfferId: string | null = null) =>
  act(async () => mapOffer(check(await db().rpc('make_offer', { p_item_ids: itemIds, p_amount_millimes: amountMillimes, p_parent: parentOfferId })) as Row));
export const respondOffer = (offerId: string, accept: boolean) =>
  act(async () => { check(await db().rpc('respond_offer', { p_offer: offerId, p_accept: accept })); });

// ---------------------------------------------------------------- orders

export async function quote(itemIds: string[], delivery: DeliveryMethod, offerId: string | null = null): Promise<Quote> {
  const q = check(await db().rpc('quote', { p_items: itemIds, p_delivery: delivery, p_offer: offerId })) as Row;
  return {
    itemsMillimes: Number(q.items_millimes), bundleDiscountMillimes: Number(q.bundle_discount_millimes),
    buyerFeeMillimes: Number(q.buyer_fee_millimes), shippingMillimes: Number(q.shipping_millimes), totalMillimes: Number(q.total_millimes),
  };
}
export const checkout = (args: { itemIds: string[]; delivery: DeliveryMethod; payment: PaymentMethod; addressId: string | null; offerId?: string | null }) =>
  act(async () => {
    const r = check(await db().rpc('place_order', { p_items: args.itemIds, p_delivery: args.delivery, p_payment: args.payment, p_address: args.addressId, p_offer: args.offerId ?? null })) as Row;
    return mapOrder({ ...r, order_items: args.itemIds.map((item_id) => ({ item_id })) });
  });
export const cancelOrder = (orderId: string, reason: string) => act(async () => { check(await db().rpc('cancel_order', { p_order: orderId, p_reason: reason })); });
export const markShipped = (orderId: string) => act(async () => { check(await db().rpc('mark_shipped', { p_order: orderId })); });
/** Demo only: in production the courier webhook marks parcels delivered. */
export async function devMarkDelivered(_orderId: string) { throw new ApiError('courier_only'); }
export const confirmReceived = (orderId: string) => act(async () => { check(await db().rpc('confirm_received', { p_order: orderId })); });
export const leaveFeedback = (orderId: string, stars: number, body: string) =>
  act(async () => { check(await db().rpc('leave_feedback', { p_order: orderId, p_stars: stars, p_body: body })); });

export const openClaim = (orderId: string, reason: ClaimReason, description: string, photos: Photo[]) =>
  act(async () => {
    const uid = me();
    const paths = await Promise.all(photos.filter((p) => p.uri).map((p, i) => uploadPhoto('claims', `${uid}/${orderId}/${i}.jpg`, p.uri!)));
    check(await db().rpc('open_claim', { p_order: orderId, p_reason: reason, p_description: description, p_photos: paths }));
  });

// ---------------------------------------------------------------- notifications

export function markNotificationsRead() {
  if (!readStore().notifications.some((n) => n.userId === readStore().me && !n.readAt)) return;
  act(async () => check(await db().rpc('mark_notifications_read'))).catch(() => {});
}

// ---------------------------------------------------------------- money

export const submitIdVerification = (front: Photo, back: Photo) =>
  act(async () => {
    const uid = me();
    if (!front?.uri || !back?.uri) throw new ApiError('photos_required');
    const [f, b] = await Promise.all([uploadPhoto('id-docs', `${uid}/front.jpg`, front.uri), uploadPhoto('id-docs', `${uid}/back.jpg`, back.uri)]);
    check(await db().from('id_verifications').insert({ user_id: uid, cin_front_path: f, cin_back_path: b }));
  });
/** Demo only: an admin approves IDs and reconciles courier cash from the admin web app. */
export function devApproveId() { throw new ApiError('admin_only'); }
export function devReconcileCod() { throw new ApiError('admin_only'); }

export const savePayoutMethod = (kind: PayoutMethod['kind'], holderName: string, accountRef: string) =>
  act(async () => {
    const ref = accountRef.replace(/\s/g, '');
    if (holderName.trim().length < 3) throw new ApiError('holder');
    if (kind === 'bank_rib' && !/^\d{20}$/.test(ref)) throw new ApiError('rib');
    if (kind !== 'bank_rib' && !/^\d{8}$/.test(ref)) throw new ApiError('wallet_phone');
    const c = db();
    check(await c.from('payout_methods').delete().eq('user_id', me()));
    check(await c.from('payout_methods').insert({ user_id: me(), kind, holder_name: holderName.trim(), account_ref: ref, is_default: true }));
  });
export const requestPayout = (amountMillimes: number) => act(async () => { check(await db().rpc('request_payout', { p_amount: amountMillimes })); });

// ---------------------------------------------------------------- settings

export const updateProfile = (patch: Partial<Pick<Profile, 'displayName' | 'bio' | 'city' | 'governorate' | 'holidayMode'>>) =>
  act(async () => {
    const row: Row = {};
    if (patch.displayName != null) row.display_name = patch.displayName;
    if (patch.bio != null) row.bio = patch.bio;
    if (patch.city != null) row.city = patch.city;
    if (patch.governorate != null) row.governorate = patch.governorate;
    if (patch.holidayMode != null) row.holiday_mode = patch.holidayMode;
    check(await db().from('profiles').update(row).eq('id', me()));
  });
export const saveAddress = (a: Omit<Address, 'id' | 'userId'>) =>
  act(async () => {
    const c = db();
    const existing = readStore().addresses.find((x) => x.userId === me());
    const row = { user_id: me(), full_name: a.fullName, phone: a.phone, line1: a.line1, city: a.city, governorate: a.governorate, postcode: a.postcode || null, is_default: true };
    check(existing ? await c.from('addresses').update(row).eq('id', existing.id) : await c.from('addresses').insert(row));
  });
export const setBundleDiscounts = (tiers: { minItems: number; percent: number }[]) =>
  act(async () => {
    const c = db();
    check(await c.from('bundle_discounts').delete().eq('seller_id', me()));
    if (tiers.length) check(await c.from('bundle_discounts').insert(tiers.map((t) => ({ seller_id: me(), min_items: t.minItems, percent: t.percent }))));
  });
export async function deleteAccount() {
  const res = await db().functions.invoke('delete-account', { method: 'POST' });
  if (res.error) throw new ApiError('open_orders');
  signOut();
}

// ---------------------------------------------------------------- safety

export const report = (target: ReportTarget, reason: string, details: string) =>
  act(async () => { check(await db().from('reports').insert({ reporter_id: me(), target_type: target.type, target_id: target.id, reason, details })); });
export function toggleBlock(userId: string) {
  const on = readStore().blocks.some((b) => b.blockerId === readStore().me && b.blockedId === userId);
  act(async () => check(on
    ? await db().from('blocks').delete().eq('blocker_id', me()).eq('blocked_id', userId)
    : await db().from('blocks').insert({ blocker_id: me(), blocked_id: userId }))).catch(() => {});
}
