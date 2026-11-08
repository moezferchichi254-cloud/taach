import type { Address, BundleDiscount, Category, Feedback, Item, Profile } from './types';

// Demo data only. Placeholder photos are flat tones, no real images.

export const seedProfiles: Profile[] = [
  { id: 'u-amira', username: 'amira.vintage', displayName: 'Amira', governorate: 'Tunis', city: 'La Marsa', ratingAvg: 4.9, ratingCount: 38, idVerified: true },
  { id: 'u-sami', username: 'sami_s', displayName: 'Sami', governorate: 'Sfax', city: 'Sfax', ratingAvg: 4.6, ratingCount: 12, idVerified: false },
  { id: 'u-leila', username: 'leila.retro', displayName: 'Leïla', governorate: 'Sousse', city: 'Sousse', ratingAvg: 5, ratingCount: 7, idVerified: true },
];

export const seedAddresses: Address[] = [
  { id: 'a-sami', userId: 'u-sami', fullName: 'Sami Ben Ali', phone: '+216 20 000 002', line1: '12 rue Habib Thameur', city: 'Sfax', governorate: 'Sfax', postcode: '3000' },
  { id: 'a-amira', userId: 'u-amira', fullName: 'Amira Trabelsi', phone: '+216 20 000 001', line1: '5 avenue de la Corniche', city: 'La Marsa', governorate: 'Tunis', postcode: '2070' },
  { id: 'a-leila', userId: 'u-leila', fullName: 'Leïla Gharbi', phone: '+216 20 000 003', line1: '8 rue de Monastir', city: 'Sousse', governorate: 'Sousse', postcode: '4000' },
];

export const seedCategories: Category[] = [
  { id: 'c-women', slug: 'women', nameFr: 'Femme', nameEn: 'Women', parentId: null },
  { id: 'c-men', slug: 'men', nameFr: 'Homme', nameEn: 'Men', parentId: null },
  { id: 'c-home', slug: 'home', nameFr: 'Maison & déco', nameEn: 'Home & decor', parentId: null },
  { id: 'c-books', slug: 'books', nameFr: 'Livres & vinyles', nameEn: 'Books & vinyl', parentId: null },
  { id: 'c-acc', slug: 'accessories', nameFr: 'Accessoires', nameEn: 'Accessories', parentId: null },
];

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const seedItems: Item[] = [
  { id: 'i-1', sellerId: 'u-amira', title: 'Veste en cuir années 80', description: 'Cuir épais, doublure intacte. Petite usure au col (photo 3).', categoryId: 'c-women', brand: null, size: 'M', condition: 'good', isVintage: true, era: '1980s', priceMillimes: 85000, parcelSize: 'medium', status: 'active', photos: [{ uri: null, tone: '#6b4a2f' }, { uri: null, tone: '#3d2a1b' }], favouriteCount: 14, createdAt: ago(2) },
  { id: 'i-2', sellerId: 'u-leila', title: 'Robe brodée kaftan', description: 'Broderie main, portée une fois pour un mariage.', categoryId: 'c-women', brand: null, size: 'S', condition: 'very_good', isVintage: false, era: null, priceMillimes: 120000, parcelSize: 'medium', status: 'active', photos: [{ uri: null, tone: '#8c2f39' }], favouriteCount: 9, createdAt: ago(5) },
  { id: 'i-3', sellerId: 'u-amira', title: 'Lot de 3 vinyles de malouf', description: 'Pochettes d’origine, disques testés.', categoryId: 'c-books', brand: null, size: null, condition: 'good', isVintage: true, era: '1970s', priceMillimes: 45000, parcelSize: 'small', status: 'active', photos: [{ uri: null, tone: '#2f3e4e' }], favouriteCount: 4, createdAt: ago(9) },
  { id: 'i-4', sellerId: 'u-leila', title: 'Baskets Adidas Gazelle', description: 'Pointure 42, semelle en très bon état.', categoryId: 'c-men', brand: 'Adidas', size: '42', condition: 'very_good', isVintage: false, era: null, priceMillimes: 95000, parcelSize: 'medium', status: 'active', photos: [{ uri: null, tone: '#3f5a46' }], favouriteCount: 21, createdAt: ago(20) },
  { id: 'i-5', sellerId: 'u-amira', title: 'Théière en cuivre ciselé', description: 'Pièce artisanale, environ 40 ans.', categoryId: 'c-home', brand: null, size: null, condition: 'satisfactory', isVintage: true, era: '1980s', priceMillimes: 38000, parcelSize: 'small', status: 'active', photos: [{ uri: null, tone: '#9a6a32' }], favouriteCount: 6, createdAt: ago(30) },
  { id: 'i-6', sellerId: 'u-leila', title: 'Sac en paille tressée', description: 'Fait main à Nabeul, anses en cuir.', categoryId: 'c-acc', brand: null, size: null, condition: 'new_without_tags', isVintage: false, era: null, priceMillimes: 30000, parcelSize: 'small', status: 'active', photos: [{ uri: null, tone: '#b08d57' }], favouriteCount: 3, createdAt: ago(48) },
];

export const seedBundleDiscounts: BundleDiscount[] = [
  { sellerId: 'u-amira', minItems: 2, percent: 10 },
  { sellerId: 'u-amira', minItems: 3, percent: 15 },
];

// A few past reviews so profiles are not empty (demo only).
export const seedFeedback: Feedback[] = [
  { id: 'f-1', orderId: null, fromUserId: 'u-leila', toUserId: 'u-amira', role: 'buyer_to_seller', stars: 5, body: 'Pièce magnifique, très bien emballée. Merci !', isAutomatic: false, createdAt: ago(24 * 12) },
  { id: 'f-2', orderId: null, fromUserId: 'u-sami', toUserId: 'u-amira', role: 'buyer_to_seller', stars: 5, body: 'Envoi rapide, conforme aux photos.', isAutomatic: false, createdAt: ago(24 * 30) },
  { id: 'f-3', orderId: null, fromUserId: null, toUserId: 'u-amira', role: 'buyer_to_seller', stars: 5, body: null, isAutomatic: true, createdAt: ago(24 * 45) },
  { id: 'f-4', orderId: null, fromUserId: 'u-amira', toUserId: 'u-leila', role: 'buyer_to_seller', stars: 5, body: 'Robe superbe, vendeuse adorable.', isAutomatic: false, createdAt: ago(24 * 20) },
  { id: 'f-5', orderId: null, fromUserId: 'u-amira', toUserId: 'u-sami', role: 'buyer_to_seller', stars: 4, body: 'Bon contact, un peu de retard à l’envoi.', isAutomatic: false, createdAt: ago(24 * 60) },
];
