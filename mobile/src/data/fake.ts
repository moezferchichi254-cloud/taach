// In-memory data layer for the demo. Same function names and shapes as the
// Supabase version (replica/architecture.md, "API"), so screens don't change
// when it is swapped. Rules here mirror the database rules in schema.sql.

import { useRef, useSyncExternalStore } from 'react';
import { buyerFee, CONFIRM_WITHIN_DAYS, SHIP_WITHIN_DAYS, shippingFor } from '../lib/pricing';
import { seedAddresses, seedCategories, seedItems, seedProfiles } from './seed';
import type {
  Address, Category, DeliveryMethod, Item, LedgerEntry, NewItem, Order, PaymentMethod, Profile, Quote, Wallet,
} from './types';

type State = {
  me: string | null;
  profiles: Profile[];
  addresses: Address[];
  categories: Category[];
  items: Item[];
  orders: Order[];
  ledger: LedgerEntry[];
};

let state: State = {
  me: null,
  profiles: seedProfiles,
  addresses: seedAddresses,
  categories: seedCategories,
  items: seedItems,
  orders: [],
  ledger: [],
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
const wait = () => new Promise((r) => setTimeout(r, 150));
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
const plusDays = (d: number) => new Date(Date.now() + d * 86400_000).toISOString();
function requireMe() {
  if (!state.me) throw new ApiError('not_signed_in');
  return state.me;
}

// ---- auth (phone OTP; any 4-digit code in the demo)
export async function signInWithPhone(_phone: string, code: string) {
  await wait();
  if (!/^\d{4}$/.test(code)) throw new ApiError('invalid_code');
  set({ me: 'u-sami' });
}
export function signInAs(userId: string) { set({ me: userId }); }
export function signOut() { set({ me: null }); }

// ---- selectors (reads; RLS in the real version)
export const selectMe = (s: State) => s.profiles.find((p) => p.id === s.me) ?? null;
export const selectFeed = (s: State) =>
  s.items.filter((i) => i.status === 'active' || i.status === 'reserved')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const selectItem = (id: string) => (s: State) => s.items.find((i) => i.id === id) ?? null;
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

// ---- F01 list an item
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

// ---- F03 buy
export async function quote(itemIds: string[], delivery: DeliveryMethod): Promise<Quote> {
  await wait();
  const items = itemIds.map((id) => state.items.find((i) => i.id === id));
  if (items.some((i) => !i || i.status !== 'active')) throw new ApiError('items_unavailable');
  const itemsMillimes = items.reduce((a, i) => a + i!.priceMillimes, 0);
  const shippingMillimes = shippingFor(items.map((i) => i!.parcelSize), delivery);
  const buyerFeeMillimes = buyerFee(itemsMillimes);
  return {
    itemsMillimes, bundleDiscountMillimes: 0, buyerFeeMillimes, shippingMillimes,
    totalMillimes: itemsMillimes + buyerFeeMillimes + shippingMillimes,
  };
}

export async function checkout(args: {
  itemIds: string[]; delivery: DeliveryMethod; payment: PaymentMethod; addressId: string | null;
}): Promise<Order> {
  const me = requireMe();
  const q = await quote(args.itemIds, args.delivery);
  // re-check after the quote: the race guard (one live order per item)
  const items = args.itemIds.map((id) => state.items.find((i) => i.id === id)!);
  if (items.some((i) => i.status !== 'active')) throw new ApiError('items_unavailable');
  const sellerId = items[0].sellerId;
  if (items.some((i) => i.sellerId !== sellerId)) throw new ApiError('one_seller_only');
  if (sellerId === me) throw new ApiError('own_item');
  if (args.payment !== 'cod') throw new ApiError('online_payment_not_available_yet');
  const address = args.delivery === 'courier' ? state.addresses.find((a) => a.id === args.addressId) ?? null : null;
  if (args.delivery === 'courier' && !address) throw new ApiError('address_required');

  const order: Order = {
    ...q, id: uid('o'), number: Math.random().toString(36).slice(2, 12).toUpperCase(),
    buyerId: me, sellerId, itemIds: args.itemIds, paymentMethod: args.payment,
    deliveryMethod: args.delivery, shippingAddress: address, status: 'confirmed',
    createdAt: now(), confirmedAt: now(), shipBy: plusDays(SHIP_WITHIN_DAYS),
    shippedAt: null, deliveredAt: null, completesAt: null, completedAt: null, trackingNumber: null,
  };
  set({
    orders: [order, ...state.orders],
    items: state.items.map((i) => (args.itemIds.includes(i.id) ? { ...i, status: 'reserved' } : i)),
  });
  return order;
}

// ---- F06 ship (manual courier adapter for now)
export async function markShipped(orderId: string) {
  const me = requireMe();
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.sellerId !== me || o.status !== 'confirmed') throw new ApiError('cannot_ship');
  patchOrder(orderId, { status: 'shipped', shippedAt: now(), trackingNumber: 'TN' + Math.floor(Math.random() * 1e9) });
}

/** Demo stand-in for the courier webhook: "delivered" (COD: cash collected). */
export async function devMarkDelivered(orderId: string) {
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.status !== 'shipped') throw new ApiError('cannot_deliver');
  patchOrder(orderId, { status: 'delivered', deliveredAt: now(), completesAt: plusDays(CONFIRM_WITHIN_DAYS) });
}

// ---- F07 complete (mirrors confirm_received + complete_order in schema.sql)
export async function confirmReceived(orderId: string) {
  const me = requireMe();
  await wait();
  const o = state.orders.find((x) => x.id === orderId);
  if (!o || o.buyerId !== me || o.status !== 'delivered') throw new ApiError('cannot_complete');
  patchOrder(orderId, { status: 'completed', completedAt: now() });
  if (!state.ledger.some((l) => l.orderId === orderId)) {
    set({
      ledger: [...state.ledger, {
        id: uid('l'), userId: o.sellerId, orderId, kind: 'sale',
        amountMillimes: o.itemsMillimes - o.bundleDiscountMillimes,
        // COD: stays pending until the courier's cash is reconciled by an admin
        state: o.paymentMethod === 'cod' ? 'pending' : 'available',
      }],
    });
  }
  set({ items: state.items.map((i) => (o.itemIds.includes(i.id) ? { ...i, status: 'sold' } : i)) });
}

function patchOrder(id: string, patch: Partial<Order>) {
  set({ orders: state.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
}
