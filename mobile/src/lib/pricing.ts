import type { DeliveryMethod, ParcelSize } from '../data/types';

// PLACEHOLDER prices. Replace with your courier's real rates and your chosen fee
// before launch. All in millimes.
export const SHIPPING_MILLIMES: Record<ParcelSize, number> = {
  small: 7000,
  medium: 8000,
  large: 10000,
};

/** Buyer protection fee: 5% of the items + 0.500 TND, rounded to 10 millimes. */
export function buyerFee(itemsMillimes: number) {
  return Math.round((itemsMillimes * 0.05 + 500) / 10) * 10;
}

export function shippingFor(sizes: ParcelSize[], delivery: DeliveryMethod) {
  if (delivery === 'hand') return 0;
  // one parcel: the largest size wins
  const order: ParcelSize[] = ['small', 'medium', 'large'];
  const biggest = sizes.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a), 'small');
  return SHIPPING_MILLIMES[biggest];
}

/** Seller ships within 5 days; buyer has 2 days after delivery. */
export const SHIP_WITHIN_DAYS = 5;
export const CONFIRM_WITHIN_DAYS = 2;
export const MAX_OFFER_DISCOUNT = 0.4;
