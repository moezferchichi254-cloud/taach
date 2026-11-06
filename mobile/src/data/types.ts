// Mirrors replica/schema.sql. Money in millimes.

export type Condition = 'new_with_tags' | 'new_without_tags' | 'very_good' | 'good' | 'satisfactory';
export type ItemStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'hidden' | 'removed';
export type ParcelSize = 'small' | 'medium' | 'large';
export type OrderStatus =
  | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed'
  | 'cancelled' | 'refused' | 'disputed' | 'refunded';
export type PaymentMethod = 'cod' | 'konnect' | 'flouci';
export type DeliveryMethod = 'courier' | 'hand';

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  governorate: string;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  idVerified: boolean;
};

export type Address = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  governorate: string;
  postcode?: string;
};

export type Category = { id: string; slug: string; nameFr: string; nameEn: string; parentId: string | null };

export type Photo = {
  /** a local file / remote URL, or null for the demo placeholder */
  uri: string | null;
  /** placeholder tone for demo data with no photo */
  tone?: string;
};

export type Item = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  categoryId: string;
  brand: string | null;
  size: string | null;
  condition: Condition;
  isVintage: boolean;
  era: string | null;
  priceMillimes: number;
  parcelSize: ParcelSize;
  status: ItemStatus;
  photos: Photo[];
  favouriteCount: number;
  createdAt: string;
};

export type NewItem = Omit<Item, 'id' | 'sellerId' | 'status' | 'favouriteCount' | 'createdAt'>;

export type Quote = {
  itemsMillimes: number;
  bundleDiscountMillimes: number;
  buyerFeeMillimes: number;
  shippingMillimes: number;
  totalMillimes: number;
};

export type Order = Quote & {
  id: string;
  number: string;
  buyerId: string;
  sellerId: string;
  itemIds: string[];
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  shippingAddress: Address | null;
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  shipBy: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completesAt: string | null;
  completedAt: string | null;
  trackingNumber: string | null;
};

export type LedgerEntry = {
  id: string;
  userId: string;
  orderId: string;
  kind: 'sale';
  amountMillimes: number;
  state: 'pending' | 'available';
};

export type Wallet = { pendingMillimes: number; availableMillimes: number };
