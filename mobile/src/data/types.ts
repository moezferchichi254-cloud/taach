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
  bio?: string;
  governorate: string;
  city: string;
  holidayMode?: boolean;
  createdAt?: string;
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
  offerId: string | null;
  cancelReason?: string | null;
};

export type LedgerEntry = {
  id: string;
  userId: string;
  orderId: string | null;
  payoutId?: string;
  kind: 'sale' | 'payout' | 'adjustment';
  amountMillimes: number;
  state: 'pending' | 'available';
};

export type Wallet = { pendingMillimes: number; availableMillimes: number };

export type Conversation = {
  id: string;
  itemId: string | null;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  buyerReadAt: string | null;
  sellerReadAt: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string | null; // null = system
  kind: 'text' | 'offer' | 'order_event' | 'system';
  body: string | null;
  offerId?: string;
  orderId?: string;
  flagged: boolean;
  createdAt: string;
};

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'expired' | 'used';
export type Offer = {
  id: string;
  conversationId: string;
  fromUserId: string;
  itemIds: string[];
  listPriceMillimes: number;
  amountMillimes: number;
  parentOfferId: string | null;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
};

export type Feedback = {
  id: string;
  orderId: string | null;
  fromUserId: string | null; // null = automatic
  toUserId: string;
  role: 'buyer_to_seller' | 'seller_to_buyer';
  stars: number;
  body: string | null;
  isAutomatic: boolean;
  createdAt: string;
};

export type ClaimReason = 'not_received' | 'damaged' | 'not_as_described' | 'counterfeit' | 'other';
export type Claim = {
  id: string;
  orderId: string;
  openedBy: string;
  reason: ClaimReason;
  description: string;
  photos: Photo[];
  status: 'open' | 'seller_responded' | 'return_requested' | 'refunded' | 'rejected' | 'escalated';
  createdAt: string;
};

export type SearchFilters = {
  categoryId?: string | null;
  sizes?: string[];
  conditions?: Condition[];
  vintageOnly?: boolean;
  minMillimes?: number | null;
  maxMillimes?: number | null;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
};

export type SavedSearch = { id: string; userId: string; query: string; filters: SearchFilters; alertsOn: boolean; createdAt: string };

export type NotificationKind = 'message' | 'offer' | 'order_update' | 'favourite' | 'feedback' | 'claim' | 'payout' | 'id_check';
export type AppNotification = {
  id: string;
  userId: string;
  kind: NotificationKind;
  text: { fr: string; en: string };
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type PayoutMethod = { id: string; userId: string; kind: 'bank_rib' | 'd17' | 'flouci_wallet'; holderName: string; accountRef: string };
export type Payout = { id: string; userId: string; amountMillimes: number; methodId: string; status: 'requested' | 'processing' | 'paid' | 'failed'; requestedAt: string };
export type IdVerification = { userId: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string };
export type BundleDiscount = { sellerId: string; minItems: number; percent: number };
export type ReportTarget = { type: 'item' | 'user' | 'message'; id: string };
