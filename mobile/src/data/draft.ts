// The sell form's draft, shared with the picker screens.
import { useSyncExternalStore } from 'react';
import type { Condition, ParcelSize, Photo } from './types';

export type Draft = {
  photos: Photo[];
  title: string;
  description: string;
  categoryId: string | null;
  brand: string | null;
  size: string | null;
  condition: Condition | null;
  isVintage: boolean;
  era: string | null;
  price: string;
  parcelSize: ParcelSize;
};

const empty = (): Draft => ({
  photos: [], title: '', description: '', categoryId: null, brand: null, size: null,
  condition: null, isVintage: false, era: null, price: '', parcelSize: 'small',
});

let draft = empty();
const ls = new Set<() => void>();
export function setDraft(p: Partial<Draft>) { draft = { ...draft, ...p }; ls.forEach((l) => l()); }
export function resetDraft() { draft = empty(); ls.forEach((l) => l()); }
export function useDraft() {
  return useSyncExternalStore((l) => { ls.add(l); return () => { ls.delete(l); }; }, () => draft, () => draft);
}
