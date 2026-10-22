export interface EconomyStore {
  readonly hearts: number;
  readonly inventory: Readonly<Record<string, number>>;
  addHearts(count: number): void;
  spendHearts(count: number): boolean;
  addItem(itemId: string, count?: number): void;
  consumeItem(itemId: string): boolean;
}

export type PurchaseFailure = 'invalid-item' | 'invalid-price' | 'insufficient-hearts';

export type PurchaseResult =
  { ok: true; hearts: number } | { ok: false; reason: PurchaseFailure; hearts: number };

export function canAfford(store: EconomyStore, price: number): boolean {
  return Number.isFinite(price) && price >= 0 && store.hearts >= Math.floor(price);
}

export function itemCount(store: EconomyStore, itemId: string): number {
  return store.inventory[itemId] ?? 0;
}

export function purchase(store: EconomyStore, itemId: string, price: number): PurchaseResult {
  if (itemId.trim().length === 0) {
    return { ok: false, reason: 'invalid-item', hearts: store.hearts };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, reason: 'invalid-price', hearts: store.hearts };
  }

  const cost = Math.floor(price);
  if (cost > store.hearts) {
    return { ok: false, reason: 'insufficient-hearts', hearts: store.hearts };
  }

  if (cost > 0 && !store.spendHearts(cost)) {
    return { ok: false, reason: 'insufficient-hearts', hearts: store.hearts };
  }

  store.addItem(itemId);
  return { ok: true, hearts: store.hearts };
}

export function useItem(store: EconomyStore, itemId: string): boolean {
  return store.consumeItem(itemId);
}

export function rewardCare(store: EconomyStore, hearts: number): number {
  if (!Number.isFinite(hearts) || hearts <= 0) {
    return 0;
  }
  const amount = Math.floor(hearts);
  store.addHearts(amount);
  return amount;
}
