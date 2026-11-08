// The search query and filters, shared between the Search tab and the Filters screen.
import { useSyncExternalStore } from 'react';
import type { SearchFilters } from './types';

type S = { query: string; filters: SearchFilters };
let s: S = { query: '', filters: { sort: 'relevance' } };
const ls = new Set<() => void>();
export function setSearch(p: Partial<S>) { s = { ...s, ...p }; ls.forEach((l) => l()); }
export function setFilters(p: Partial<SearchFilters>) { setSearch({ filters: { ...s.filters, ...p } }); }
export function resetFilters() { setSearch({ filters: { sort: 'relevance' } }); }
export function useSearch() {
  return useSyncExternalStore((l) => { ls.add(l); return () => { ls.delete(l); }; }, () => s, () => s);
}
export function activeFilterCount(f: SearchFilters) {
  return [f.categoryId, f.sizes?.length, f.conditions?.length, f.vintageOnly, f.minMillimes != null, f.maxMillimes != null].filter(Boolean).length;
}
