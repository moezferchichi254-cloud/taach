// In-memory data layer for the demo. Same function names and shapes as the
// Supabase version (replica/architecture.md, "API"), so screens don't change
// when it is swapped. Rules here mirror the database rules in schema.sql.

import { useRef, useSyncExternalStore } from 'react';
import { buyerFee, CONFIRM_WITHIN_DAYS, MAX_OFFER_DISCOUNT, SHIP_WITHIN_DAYS, shippingFor } from '../lib/pricing';
import { seedAddresses, seedBundleDiscounts, seedCategories, seedFeedback, seedItems, seedProfiles } from './seed';
import type {
  Address, AppNotification, BundleDiscount, Category, Claim, ClaimReason, Conversation, DeliveryMethod, Feedback,
  IdVerification, Item, LedgerEntry, Message, NewItem, NotificationKind, Offer, Order, Payout, PaymentMethod,
  PayoutMethod, Photo, Profile, Quote, ReportTarget, SavedSearch, SearchFilters, Wallet,
} from './types';

export type State = {
  me: string | null;
  profiles: Profile[];
  addresses: Address[];
  categories: Category[];
  items: Item[];
  orders: Order[];
  ledger: LedgerEntry[];
  favourites: { userId: string; itemId: string }[];
  conversations: Conversation[];
  messages: Message[];
  offers: Offer[];
  feedback: Feedback[];
  claims: Claim[];
  savedSearches: SavedSearch[];
  notifications: AppNotification[];
  payoutMethods: PayoutMethod[];
  payouts: Payout[];
  idVerifications: IdVerification[];
  bundleDiscounts: BundleDiscount[];
  blocks: { blockerId: string; blockedId: string }[];
  reports: (ReportTarget & { reporterId: string; reason: string; details: string })[];
};

let state: State = {
  me: null,
  profiles: seedProfiles,
  addresses: seedAddresses,
  categories: seedCategories,
  items: seedItems,
  orders: [],
  ledger: [],
  favourites: [],
  conversations: [],
  messages: [],
  offers: [],
  feedback: seedFeedback,
  claims: [],
  savedSearches: [],
  notifications: [],
  payoutMethods: [],
  payouts: [],
  idVerifications: [],
  bundleDiscounts: seedBundleDiscounts,
  blocks: [],
  reports: [],
};

const listeners = new Set<() => void>();
function readState(): State { return state; }
function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Read from the store. The result is cached until the state or `key`
 *  changes, so selectors may build new arrays without looping. Pass the
 *  selector's parameters as `key` (an id, a tab...). */
export function useStore<T>(select: (s: State) => T, key: string | number | null = null): T {
  const cache = useRef<{ state: State; key: string | number | null; value: T } | null>(null);
  const get = (): T => {
    const now: State = readState();
    const hit = cache.current;
    if (hit !== null && hit.state === now && hit.key === key) return hit.value;
    const value = select(now);
    cache.current = { state: now, key, value };
    return value;
  };
  return useSyncExternalStore(subscribe, get, get);
}

export class ApiError extends Error {}

/** Used by the Supabase data layer to load server data into the same store. */
export function hydrate(next: Partial<State>) { set(next); }
export function readStore(): State { return state; }
const wait = () => new Promise((r) => setTimeout(r, 150));
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
const plusDays = (d: number) => new Date(Date.now() + d * 86400_000).toISOString();
function requireMe() {
  if (!state.me) throw new ApiError('not_signed_in');
  return state.me;
}
const isBlocked = (a: string, b: string) =>
  state.blocks.some((x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));

function notify(userId: string, kind: NotificationKind, fr: string, en: string, href: string | null) {
  set({ notifications: [{ id: uid('n'), userId, kind, text: { fr, en }, href, readAt: null, createdAt: now() }, ...state.notifications] });
}

// ---------------------------------------------------------------- auth

export async function sendPhoneCode(phone: string) {
  await wait();
  if (!/^\+216\d{8}$/.test(phone)) throw new ApiError('invalid_phone');
}

export async function signInWithPhone(_phone: string, code: string) {
  await wait();
  if (!/^\d{4}$/.test(code)) throw new ApiError('invalid_code');
  set({ me: 'u-sami' });
}
export function signInAs(userId: string) { set({ me: userId }); }
export function signOut() { set({ me: null }); }

// ---------------------------------------------------------------- reads (RLS in the real version)

const visible = (i: Item) => i.status === 'active' || i.status === 'reserved';
const notHidden = (s: State, i: Item) => !s.profiles.find((p) => p.id === i.sellerId)?.holidayMode;

export const selectMe = (s: State) => s.profiles.find((p) => p.id === s.me) ?? null;
export const selectFeed = (s: State) =>
  s.items.filter((i) => visible(i) && notHidden(s, i)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const selectItem = (id: string) => (s: State) => s.items.find((i) => i.id === id) ?? null;
export const selectItems = (ids: string[]) => (s: State) => ids.map((id) => s.items.find((i) => i.id === id)).filter((i): i is Item => !!i);
export const selectProfile = (id: string) => (s: State) => s.profiles.find((p) => p.id === id) ?? null;
export const selectCategories = (s: State) => s.categories;
export const selectMyAddress = (s: State) => s.addresses.find((a) => a.userId === s.me) ?? null;
export const selectOrder = (id: string) => (s: State) =>
  s.orders.find((o) => o.id === id && (o.buyerId === s.me || o.sellerId === s.me)) ?? null;
export const selectMyOrders = (role: 'bought' | 'sold') => (s: State) =>
  s.orders.filter((o) => (role === 'bought' ? o.buyerId : o.sellerId) === s.me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const selectWallet = (s: State): Wallet => {
  const mine = s.ledger.filter((l) => l.userId === s.me);
  return {
    pendingMillimes: mine.filter((l) => l.state === 'pending').reduce((a, l) => a + l.amountMillimes, 0),
    availableMillimes: mine.filter((l) => l.state === 'available').reduce((a, l) => a + l.amountMillimes, 0),
  };
};
export const selectLedger = (s: State) => s.ledger.filter((l) => l.userId === s.me).slice().reverse();
export const selectWardrobe = (userId: string) => (s: State) =>
  s.items.filter((i) => i.sellerId === userId && (i.status !== 'removed' && (i.status !== 'hidden' || userId === s.me)) && (i.status !== 'draft'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const selectFeedbackFor = (userId: string) => (s: State) =>
  s.feedback.filter((f) => f.toUserId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const selectIsFavourite = (itemId: string) => (s: State) => s.favourites.some((f) => f.userId === s.me && f.itemId === itemId);
export const selectFavourites = (s: State) =>
  s.favourites.filter((f) => f.userId === s.me).map((f) => s.items.find((i) => i.id === f.itemId)).filter((i): i is Item => !!i);
export const selectConversations = (s: State) =>
  s.conversations.filter((c) => c.buyerId === s.me || c.sellerId === s.me).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
export const selectConversation = (id: string) => (s: State) =>
  s.conversations.find((c) => c.id === id && (c.buyerId === s.me || c.sellerId === s.me)) ?? null;
export const selectMessages = (conversationId: string) => (s: State) =>
  s.messages.filter((m) => m.conversationId === conversationId);
export const selectLastMessage = (conversationId: string) => (s: State) =>
  s.messages.filter((m) => m.conversationId === conversationId).at(-1) ?? null;
export const selectOffer = (id: string) => (s: State) => s.offers.find((o) => o.id === id) ?? null;
export const selectUnreadCount = (s: State) =>
  s.conversations.filter((c) => {
    if (c.buyerId !== s.me && c.sellerId !== s.me) return false;
    const readAt = c.buyerId === s.me ? c.buyerReadAt : c.sellerReadAt;
    return s.messages.some((m) => m.conversationId === c.id && m.senderId !== s.me && (!readAt || m.createdAt > readAt));
  }).length + s.notifications.filter((n) => n.userId === s.me && !n.readAt).length;
export const selectNotifications = (s: State) => s.notifications.filter((n) => n.userId === s.me);
export const selectSavedSearches = (s: State) => s.savedSearches.filter((x) => x.userId === s.me);
export const selectClaim = (orderId: string) => (s: State) => s.claims.find((c) => c.orderId === orderId) ?? null;
export const selectMyFeedbackOn = (orderId: string) => (s: State) =>
  s.feedback.find((f) => f.orderId === orderId && f.fromUserId === s.me) ?? null;
export const selectPayoutMethods = (s: State) => s.payoutMethods.filter((p) => p.userId === s.me);
export const selectPayouts = (s: State) => s.payouts.filter((p) => p.userId === s.me);
export const selectIdVerification = (s: State) => s.idVerifications.find((v) => v.userId === s.me) ?? null;
export const selectBundleDiscounts = (sellerId: string) => (s: State) =>
  s.bundleDiscounts.filter((b) => b.sellerId === sellerId).sort((a, b) => a.minItems - b.minItems);
export const selectIsBlocked = (userId: string) => (s: State) => s.blocks.some((b) => b.blockerId === s.me && b.blockedId === userId);

// ---------------------------------------------------------------- F02 search

export function searchItems(s: State, query: string, f: SearchFilters): Item[] {
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = norm(query).split(/\s+/).filter(Boolean);
  let list = s.items.filter((i) => visible(i) && notHidden(s, i));
  if (words.length) {
    list = list.filter((i) => {
      const hay = norm([i.title, i.description, i.brand ?? '', i.era ?? ''].join(' '));
      return words.every((w) => hay.includes(w));
    });
  }
  if (f.categoryId) list = list.filter((i) => i.categoryId === f.categoryId);
  if (f.sizes?.length) list = list.filter((i) => i.size && f.sizes!.includes(i.size));
  if (f.conditions?.length) list = list.filter((i) => f.conditions!.includes(i.condition));
  if (f.vintageOnly) list = list.filter((i) => i.isVintage);
  if (f.minMillimes != null) list = list.filter((i) => i.priceMillimes >= f.minMillimes!);
  if (f.maxMillimes != null) list = list.filter((i) => i.priceMillimes <= f.maxMillimes!);
  const sort = f.sort ?? 'relevance';
  if (sort === 'price_asc') list = list.slice().sort((a, b) => a.priceMillimes - b.priceMillimes);
  else if (sort === 'price_desc') list = list.slice().sort((a, b) => b.priceMillimes - a.priceMillimes);
  else list = list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

export async function saveSearch(query: string, filters: SearchFilters) {
  const me = requireMe();
  await wait();
  set({ savedSearches: [{ id: uid('ss'), userId: me, query, filters, alertsOn: true, createdAt: now() }, ...state.savedSearches] });
}
export function toggleSearchAlerts(id: string) {
  set({ savedSearches: state.savedSearches.map((x) => (x.id === id ? { ...x, alertsOn: !x.alertsOn } : x)) });
}
export function deleteSavedSearch(id: string) {
  set({ savedSearches: state.savedSearches.filter((x) => x.id !== id) });
}

// ---------------------------------------------------------------- favourites

export function toggleFavourite(itemId: string) {
  const me = requireMe();
  const on = state.favourites.some((f) => f.userId === me && f.itemId === itemId);
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return;
  set({
    favourites: on ? state.favourites.filter((f) => !(f.userId === me && f.itemId === itemId)) : [...state.favourites, { userId: me, itemId }],
    items: state.items.map((i) => (i.id === itemId ? { ...i, favouriteCount: Math.max(0, i.favouriteCount + (on ? -1 : 1)) } : i)),
  });
  if (!on && item.sellerId !== me) {
    notify(item.sellerId, 'favourite', `Quelqu’un a ajouté « ${item.title} » à ses favoris.`, `Someone added “${item.title}” to their favourites.`, `/item/${item.id}`);
  }
}

// ---------------------------------------------------------------- F01 list an item

export async function createItem(input: NewItem): Promise<Item> {
  const me = requireMe();
  await wait();
  if (input.title.trim().length < 3 || input.title.length > 80) throw new ApiError('title');
  if (input.priceMillimes < 1000) throw new ApiError('price');
  if (input.photos.length < 1 || input.photos.length > 20) throw new ApiError('photos');
  const item: Item = { ...input, id: uid('i'), sellerId: me, status: 'active', favouriteCount: 0, createdAt: now() };
  set({ items: [item, ...state.items] });
  return item;
}

export async function setItemHidden(itemId: string, hidden: boolean) {
  const me = requireMe();
  await wait();
  const i = state.items.find((x) => x.id === itemId);
  if (!i || i.sellerId !== me || !['active', 'hidden'].includes(i.status)) throw new ApiError('cannot_edit');
  set({ items: state.items.map((x) => (x.id === itemId ? { ...x, status: hidden ? 'hidden' : 'active' } : x)) });
}

export async function deleteItem(itemId: string) {
  const me = requireMe();
  await wait();
  const i = state.items.find((x) => x.id === itemId);
  if (!i || i.sellerId !== me || !['active', 'hidden', 'draft'].includes(i.status)) throw new ApiError('cannot_delete');
  set({ items: state.items.map((x) => (x.id === itemId ? { ...x, status: 'removed' } : x)) });
}

// ---------------------------------------------------------------- F10 chat

/** Open (or reuse) the conversation about an item, as the buyer. */
export async function startConversation(itemId: string): Promise<Conversation> {
  const me = requireMe();
  await wait();
  const item = state.items.find((i) => i.id === itemId);
  if (!item) throw new ApiError('item_not_found');
  if (item.sellerId === me) throw new ApiError('own_item');
  if (isBlocked(me, item.sellerId)) throw new ApiError('blocked');
  const existing = state.conversations.find((c) => c.itemId === itemId && c.buyerId === me);
  if (existing) return existing;
  const c: Conversation = { id: uid('c'), itemId, buyerId: me, sellerId: item.sellerId, lastMessageAt: now(), buyerReadAt: now(), sellerReadAt: null };
  set({ conversations: [c, ...state.conversations] });
  return c;
}

// Phone numbers, emails and "pay outside the app" get flagged.
const OFF_PLATFORM = /(\+?216)?[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|@[a-z0-9-]+\.[a-z]{2,}|whatsapp|virement|d17|hors (de l')?app|outside the app/i;

export async function sendMessage(conversationId: string, body: string) {
  const me = requireMe();
  const text = body.trim();
  if (!text) return;
  await wait();
  const c = state.conversations.find((x) => x.id === conversationId);
  if (!c || (c.buyerId !== me && c.sellerId !== me)) throw new ApiError('not_participant');
  if (isBlocked(c.buyerId, c.sellerId)) throw new ApiError('blocked');
  const m: Message = { id: uid('m'), conversationId, senderId: me, kind: 'text', body: text.slice(0, 2000), flagged: OFF_PLATFORM.test(text), createdAt: now() };
  touchConversation(c, me, [m]);
  const other = c.buyerId === me ? c.sellerId : c.buyerId;
  const name = state.profiles.find((p) => p.id === me)?.username ?? '';
  notify(other, 'message', `Nouveau message de ${name}`, `New message from ${name}`, `/conversation/${c.id}`);
}

export function markConversationRead(conversationId: string) {
  const me = state.me;
  const c = state.conversations.find((x) => x.id === conversationId);
  if (!c || !me) return;
  // no-op when nothing is new: calling it from an effect must not loop
  const readAt = c.buyerId === me ? c.buyerReadAt : c.sellerReadAt;
  const last = state.messages.filter((m) => m.conversationId === c.id).at(-1);
  if (readAt && (!last || last.createdAt <= readAt)) return;
  const patch = c.buyerId === me ? { buyerReadAt: now() } : { sellerReadAt: now() };
  set({ conversations: state.conversations.map((x) => (x.id === c.id ? { ...x, ...patch } : x)) });
}

function touchConversation(c: Conversation, by: string | null, msgs: Message[]) {
  const readPatch = by === c.buyerId ? { buyerReadAt: now() } : by === c.sellerId ? { sellerReadAt: now() } : {};
  set({
    messages: [...state.messages, ...msgs],
    conversations: state.conversations.map((x) => (x.id === c.id ? { ...x, lastMessageAt: now(), ...readPatch } : x)),
  });
}

function systemMessage(c: Conversation, body: string, extra: Partial<Message> = {}) {
  touchConversation(c, null, [{ id: uid('m'), conversationId: c.id, senderId: null, kind: 'system', body, flagged: false, createdAt: now(), ...extra }]);
}

// ---------------------------------------------------------------- F04 offers (mirrors make_offer / respond_offer)

export async function makeOffer(itemIds: string[], amountMillimes: number, parentOfferId: string | null = null): Promise<Offer> {
  const me = requireMe();
  await wait();
  const items = itemIds.map((id) => state.items.find((i) => i.id === id));
  if (!items.length || items.some((i) => !i || i.status !== 'active')) throw new ApiError('items_unavailable');
  const sellerId = items[0]!.sellerId;
  if (items.some((i) => i!.sellerId !== sellerId)) throw new ApiError('one_seller_only');
  const list = items.reduce((a, i) => a + i!.priceMillimes, 0);
  if (amountMillimes <= 0 || amountMillimes > list) throw new ApiError('offer_too_high');
  if (amountMillimes < Math.ceil(list * (1 - MAX_OFFER_DISCOUNT))) throw new ApiError('offer_too_low');

  let conv: Conversation;
  if (parentOfferId) {
    const parent = state.offers.find((o) => o.id === parentOfferId);
    const pc = parent && state.conversations.find((c) => c.id === parent.conversationId);
    if (!parent || !pc || parent.status !== 'pending' || parent.fromUserId === me || (pc.buyerId !== me && pc.sellerId !== me)) {
      throw new ApiError('cannot_counter');
    }
    set({ offers: state.offers.map((o) => (o.id === parentOfferId ? { ...o, status: 'countered' } : o)) });
    conv = pc;
  } else {
    if (sellerId === me) throw new ApiError('own_item');
    conv = await startConversation(itemIds[0]);
  }
  if (isBlocked(conv.buyerId, conv.sellerId)) throw new ApiError('blocked');
  const offer: Offer = {
    id: uid('of'), conversationId: conv.id, fromUserId: me, itemIds, listPriceMillimes: list, amountMillimes,
    parentOfferId, status: 'pending', expiresAt: plusDays(2), createdAt: now(),
  };
  set({ offers: [...state.offers, offer] });
  touchConversation(conv, me, [{ id: uid('m'), conversationId: conv.id, senderId: me, kind: 'offer', body: null, offerId: offer.id, flagged: false, createdAt: now() }]);
  const other = conv.buyerId === me ? conv.sellerId : conv.buyerId;
  notify(other, 'offer', 'Nouvelle offre reçue', 'New offer received', `/conversation/${conv.id}`);
  return offer;
}

export async function respondOffer(offerId: string, accept: boolean) {
  const me = requireMe();
  await wait();
  const o = state.offers.find((x) => x.id === offerId);
  const c = o && state.conversations.find((x) => x.id === o.conversationId);
  if (!o || !c || o.status !== 'pending' || o.fromUserId === me || (c.buyerId !== me && c.sellerId !== me)) throw new ApiError('cannot_respond');
  if (o.expiresAt < now()) {
    set({ offers: state.offers.map((x) => (x.id === offerId ? { ...x, status: 'expired' } : x)) });
    throw new ApiError('offer_expired');
  }
  const status = accept ? 'accepted' : 'declined';
  set({ offers: state.offers.map((x) => (x.id === offerId ? { ...x, status } : x)) });
  systemMessage(c, accept ? 'offer_accepted' : 'offer_declined', { offerId });
  notify(o.fromUserId, 'offer', accept ? 'Ton offre a été acceptée !' : 'Ton offre a été refusée.', accept ? 'Your offer was accepted!' : 'Your offer was declined.', `/conversation/${c.id}`);
}

// ---------------------------------------------------------------- F03 / F05 buy (one item, a bundle, or an accepted offer)

function bundleDiscountFor(sellerId: string, count: number, itemsMillimes: number) {
  const tier = state.bundleDiscounts.filter((b) => b.sellerId === sellerId && count >= b.minItems).sort((a, b) => b.percent - a.percent)[0];
  return tier ? Math.round((itemsMillimes * tier.percent) / 100 / 10) * 10 : 0;
}

function usableOffer(offerId: string | null | undefined, me: string, itemIds: string[]) {
  if (!offerId) return null;
  const o = state.offers.find((x) => x.id === offerId);
  const c = o && state.conversations.find((x) => x.id === o.conversationId);
  if (!o || !c || o.status !== 'accepted' || c.buyerId !== me) throw new ApiError('offer_not_usable');
  if (o.itemIds.length !== itemIds.length || o.itemIds.some((id) => !itemIds.includes(id))) throw new ApiError('offer_items_mismatch');
  return o;
}

export async function quote(itemIds: string[], delivery: DeliveryMethod, offerId: string | null = null): Promise<Quote> {
  await wait();
  const items = itemIds.map((id) => state.items.find((i) => i.id === id));
  if (!items.length || items.some((i) => !i || i.status !== 'active')) throw new ApiError('items_unavailable');
  const listMillimes = items.reduce((a, i) => a + i!.priceMillimes, 0);
  const offer = state.me ? usableOffer(offerId, state.me, itemIds) : null;
  const itemsMillimes = offer ? offer.amountMillimes : listMillimes;
  const bundleDiscountMillimes = offer ? 0 : bundleDiscountFor(items[0]!.sellerId, items.length, listMillimes);
  const net = itemsMillimes - bundleDiscountMillimes;
  const shippingMillimes = shippingFor(items.map((i) => i!.parcelSize), delivery);
  const buyerFeeMillimes = buyerFee(net);
  return { itemsMillimes, bundleDiscountMillimes, buyerFeeMillimes, shippingMillimes, totalMillimes: net + buyerFeeMillimes + shippingMillimes };
}

export async function checkout(args: {
  itemIds: string[]; delivery: DeliveryMethod; payment: PaymentMethod; addressId: string | null; offerId?: string | null;
}): Promise<Order> {
  const me = requireMe();
  const q = await quote(args.itemIds, args.delivery, args.offerId ?? null);
  // re-check after the quote: the race guard (one live order per item)
  const items = args.itemIds.map((id) => state.items.find((i) => i.id === id)!);
  if (items.some((i) => i.status !== 'active')) throw new ApiError('items_unavailable');
  const sellerId = items[0].sellerId;
  if (items.some((i) => i.sellerId !== sellerId)) throw new ApiError('one_seller_only');
  if (sellerId === me) throw new ApiError('own_item');
  if (args.payment !== 'cod') throw new ApiError('online_payment_not_available_yet');
  const address = args.delivery === 'courier' ? state.addresses.find((a) => a.id === args.addressId && a.userId === me) ?? null : null;
  if (args.delivery === 'courier' && !address) throw new ApiError('address_required');

  const order: Order = {
    ...q, id: uid('o'), number: Math.random().toString(36).slice(2, 12).toUpperCase(),
    buyerId: me, sellerId, itemIds: args.itemIds, paymentMethod: args.payment,
    deliveryMethod: args.delivery, shippingAddress: address, status: 'confirmed',
    createdAt: now(), confirmedAt: now(), shipBy: plusDays(SHIP_WITHIN_DAYS),
    shippedAt: null, deliveredAt: null, completesAt: null, completedAt: null, trackingNumber: null,
    offerId: args.offerId ?? null,
  };
  set({
    orders: [order, ...state.orders],
    items: state.items.map((i) => (args.itemIds.includes(i.id) ? { ...i, status: 'reserved' } : i)),
    offers: state.offers.map((o) => (o.id === args.offerId ? { ...o, status: 'used' } : o)),
  });
  const conv = state.conversations.find((c) => c.buyerId === me && c.sellerId === sellerId && c.itemId && args.itemIds.includes(c.itemId));
  if (conv) systemMessage(conv, 'order_placed', { orderId: order.id });
  notify(sellerId, 'order_update', 'Tu as vendu un article ! Expédie-le sous 5 jours.', 'You sold an item! Ship it within 5 days.', `/orders/${order.id}`);
  return order;
}

export async function cancelOrder(orderId: string, reason: string) {
  const me = requireMe();
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || (o.buyerId !== me && o.sellerId !== me) || o.status !== 'confirmed') throw new ApiError('cannot_cancel');
  patchOrder(orderId, { status: 'cancelled', cancelReason: reason });
  set({ items: state.items.map((i) => (o.itemIds.includes(i.id) ? { ...i, status: 'active' } : i)) });
  notify(o.buyerId === me ? o.sellerId : o.buyerId, 'order_update', `Commande #${o.number} annulée.`, `Order #${o.number} cancelled.`, `/orders/${o.id}`);
}

// ---------------------------------------------------------------- F06 ship (manual courier adapter for now)

export async function markShipped(orderId: string) {
  const me = requireMe();
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.sellerId !== me || o.status !== 'confirmed') throw new ApiError('cannot_ship');
  patchOrder(orderId, { status: 'shipped', shippedAt: now(), trackingNumber: 'TN' + Math.floor(Math.random() * 1e9) });
  notify(o.buyerId, 'order_update', `Ta commande #${o.number} est en route.`, `Your order #${o.number} is on its way.`, `/orders/${o.id}`);
}

/** Demo stand-in for the courier webhook: "delivered" (COD: cash collected). */
export async function devMarkDelivered(orderId: string) {
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.status !== 'shipped') throw new ApiError('cannot_deliver');
  patchOrder(orderId, { status: 'delivered', deliveredAt: now(), completesAt: plusDays(CONFIRM_WITHIN_DAYS) });
  notify(o.buyerId, 'order_update', 'Colis livré. Confirme que tout est OK sous 2 jours.', 'Parcel delivered. Confirm all is well within 2 days.', `/orders/${o.id}`);
}

// ---------------------------------------------------------------- F07 complete (mirrors confirm_received + complete_order)

export async function confirmReceived(orderId: string) {
  const me = requireMe();
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.buyerId !== me || o.status !== 'delivered') throw new ApiError('cannot_complete');
  completeOrder(o);
}

function completeOrder(o: Order) {
  patchOrder(o.id, { status: 'completed', completedAt: now() });
  if (!state.ledger.some((l) => l.orderId === o.id && l.kind === 'sale')) {
    set({
      ledger: [...state.ledger, {
        id: uid('l'), userId: o.sellerId, orderId: o.id, kind: 'sale',
        amountMillimes: o.itemsMillimes - o.bundleDiscountMillimes,
        // COD: stays pending until the courier's cash is reconciled by an admin
        state: o.paymentMethod === 'cod' ? 'pending' : 'available',
      }],
    });
  }
  set({ items: state.items.map((i) => (o.itemIds.includes(i.id) ? { ...i, status: 'sold' } : i)) });
  notify(o.sellerId, 'order_update', `Commande #${o.number} terminée. Le montant arrive sur ton solde.`, `Order #${o.number} completed. The money is on its way to your balance.`, `/wallet`);
}

function patchOrder(id: string, patch: Partial<Order>) {
  set({ orders: state.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
}

// ---------------------------------------------------------------- F08 claims

export async function openClaim(orderId: string, reason: ClaimReason, description: string, photos: Photo[]) {
  const me = requireMe();
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.buyerId !== me) throw new ApiError('cannot_claim');
  const inWindow = o.status === 'delivered' && o.completesAt && o.completesAt > now();
  const notReceived = reason === 'not_received' && o.status === 'shipped';
  if (!inWindow && !notReceived) throw new ApiError('claim_window_closed');
  if (description.trim().length < 10) throw new ApiError('description_too_short');
  if (state.claims.some((c) => c.orderId === orderId)) throw new ApiError('claim_exists');
  set({ claims: [...state.claims, { id: uid('cl'), orderId, openedBy: me, reason, description: description.trim(), photos, status: 'open', createdAt: now() }] });
  patchOrder(orderId, { status: 'disputed' });
  notify(o.sellerId, 'claim', `Un problème a été signalé sur la commande #${o.number}.`, `A problem was reported on order #${o.number}.`, `/orders/${o.id}`);
}

// ---------------------------------------------------------------- F07 feedback (mirrors leave_feedback)

export async function leaveFeedback(orderId: string, stars: number, body: string) {
  const me = requireMe();
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.status !== 'completed' || (o.buyerId !== me && o.sellerId !== me)) throw new ApiError('cannot_review');
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new ApiError('stars');
  const role = me === o.buyerId ? 'buyer_to_seller' : 'seller_to_buyer';
  const existing = state.feedback.find((f) => f.orderId === orderId && f.role === role);
  if (existing && !existing.isAutomatic) throw new ApiError('already_reviewed');
  const to = me === o.buyerId ? o.sellerId : o.buyerId;
  const f: Feedback = { id: uid('f'), orderId, fromUserId: me, toUserId: to, role, stars, body: body.trim() || null, isAutomatic: false, createdAt: now() };
  set({ feedback: [...state.feedback.filter((x) => x !== existing), f] });
  // only reviews of sellers count towards the rating
  const sellerReviews = state.feedback.filter((x) => x.toUserId === to && x.role === 'buyer_to_seller');
  if (role === 'buyer_to_seller') {
    const avg = sellerReviews.reduce((a, x) => a + x.stars, 0) / sellerReviews.length;
    set({ profiles: state.profiles.map((p) => (p.id === to ? { ...p, ratingAvg: Math.round(avg * 100) / 100, ratingCount: sellerReviews.length } : p)) });
  }
  notify(to, 'feedback', 'Tu as reçu un nouvel avis.', 'You got a new review.', `/reviews/${to}`);
}

// ---------------------------------------------------------------- notifications

export function markNotificationsRead() {
  const me = state.me;
  if (!state.notifications.some((n) => n.userId === me && !n.readAt)) return;
  set({ notifications: state.notifications.map((n) => (n.userId === me && !n.readAt ? { ...n, readAt: now() } : n)) });
}

// ---------------------------------------------------------------- F09 money

export async function submitIdVerification(front: Photo, back: Photo) {
  const me = requireMe();
  await wait();
  if (!front?.uri || !back?.uri) throw new ApiError('photos_required');
  set({ idVerifications: [...state.idVerifications.filter((v) => v.userId !== me), { userId: me, status: 'pending', createdAt: now() }] });
}

/** Demo stand-in for the admin's ID review. */
export function devApproveId() {
  const me = requireMe();
  set({
    idVerifications: state.idVerifications.map((v) => (v.userId === me ? { ...v, status: 'approved' } : v)),
    profiles: state.profiles.map((p) => (p.id === me ? { ...p, idVerified: true } : p)),
  });
  notify(me, 'id_check', 'Identité vérifiée. Tu peux retirer ton solde.', 'Identity verified. You can withdraw your balance.', '/wallet');
}

/** Demo stand-in for the admin reconciling the courier's cash transfer. */
export function devReconcileCod() {
  const me = requireMe();
  set({ ledger: state.ledger.map((l) => (l.userId === me && l.kind === 'sale' && l.state === 'pending' ? { ...l, state: 'available' } : l)) });
}

export async function savePayoutMethod(kind: PayoutMethod['kind'], holderName: string, accountRef: string) {
  const me = requireMe();
  await wait();
  const ref = accountRef.replace(/\s/g, '');
  if (holderName.trim().length < 3) throw new ApiError('holder');
  if (kind === 'bank_rib' && !/^\d{20}$/.test(ref)) throw new ApiError('rib');
  if (kind !== 'bank_rib' && !/^\d{8}$/.test(ref)) throw new ApiError('wallet_phone');
  set({ payoutMethods: [...state.payoutMethods.filter((p) => p.userId !== me), { id: uid('pm'), userId: me, kind, holderName: holderName.trim(), accountRef: ref }] });
}

export async function requestPayout(amountMillimes: number) {
  const me = requireMe();
  await wait();
  const profile = state.profiles.find((p) => p.id === me);
  if (!profile?.idVerified) throw new ApiError('id_not_verified');
  const method = state.payoutMethods.find((p) => p.userId === me);
  if (!method) throw new ApiError('no_payout_method');
  const available = state.ledger.filter((l) => l.userId === me && l.state === 'available').reduce((a, l) => a + l.amountMillimes, 0);
  if (amountMillimes <= 0 || amountMillimes > available) throw new ApiError('amount');
  const p: Payout = { id: uid('po'), userId: me, amountMillimes, methodId: method.id, status: 'requested', requestedAt: now() };
  set({
    payouts: [p, ...state.payouts],
    ledger: [...state.ledger, { id: uid('l'), userId: me, orderId: null, payoutId: p.id, kind: 'payout', amountMillimes: -amountMillimes, state: 'available' }],
  });
}

// ---------------------------------------------------------------- settings

export async function updateProfile(patch: Partial<Pick<Profile, 'displayName' | 'bio' | 'city' | 'governorate' | 'holidayMode'>>) {
  const me = requireMe();
  await wait();
  if (patch.displayName != null && patch.displayName.trim().length < 2) throw new ApiError('name');
  set({ profiles: state.profiles.map((p) => (p.id === me ? { ...p, ...patch } : p)) });
}

export async function saveAddress(a: Omit<Address, 'id' | 'userId'>) {
  const me = requireMe();
  await wait();
  if (a.fullName.trim().length < 3 || a.line1.trim().length < 3 || !a.city.trim() || !a.governorate) throw new ApiError('address');
  if (a.postcode && !/^\d{4}$/.test(a.postcode)) throw new ApiError('postcode');
  const existing = state.addresses.find((x) => x.userId === me);
  const next: Address = { ...a, id: existing?.id ?? uid('a'), userId: me };
  set({ addresses: [...state.addresses.filter((x) => x.userId !== me), next] });
}

export async function setBundleDiscounts(tiers: { minItems: number; percent: number }[]) {
  const me = requireMe();
  await wait();
  if (tiers.some((t) => t.minItems < 2 || t.minItems > 10 || t.percent < 1 || t.percent > 80)) throw new ApiError('tiers');
  set({ bundleDiscounts: [...state.bundleDiscounts.filter((b) => b.sellerId !== me), ...tiers.map((t) => ({ ...t, sellerId: me }))] });
}

/** Account deletion: listings removed, profile anonymised; orders and money records are kept. */
export async function deleteAccount() {
  const me = requireMe();
  await wait();
  if (state.orders.some((o) => (o.buyerId === me || o.sellerId === me) && ['confirmed', 'shipped', 'delivered', 'disputed'].includes(o.status))) {
    throw new ApiError('open_orders');
  }
  set({
    items: state.items.map((i) => (i.sellerId === me && i.status !== 'sold' ? { ...i, status: 'removed' } : i)),
    profiles: state.profiles.map((p) => (p.id === me ? { ...p, username: 'compte-supprime', displayName: '—', bio: '', city: '', governorate: '' } : p)),
    me: null,
  });
}

// ---------------------------------------------------------------- safety

export async function report(target: ReportTarget, reason: string, details: string) {
  const me = requireMe();
  await wait();
  set({ reports: [...state.reports, { ...target, reporterId: me, reason, details }] });
}

export function toggleBlock(userId: string) {
  const me = requireMe();
  const on = state.blocks.some((b) => b.blockerId === me && b.blockedId === userId);
  set({ blocks: on ? state.blocks.filter((b) => !(b.blockerId === me && b.blockedId === userId)) : [...state.blocks, { blockerId: me, blockedId: userId }] });
}

