import { wardrobeItemId } from '@/game/catalog/wardrobe';
import { getItem, type ItemDefinition } from '@/game/catalog/items';
import type { CharacterLook, WardrobeSlot } from '@/game/types';

export function getWardrobeItemFor(
  slot: WardrobeSlot,
  appearanceId: string,
): ItemDefinition | undefined {
  return getItem(wardrobeItemId(slot, appearanceId));
}

export function isWardrobeItemOwned(
  item: ItemDefinition,
  purchases: Readonly<Record<string, number>>,
): boolean {
  return item.price <= 0 || (purchases[item.id] ?? 0) > 0;
}

export function isWardrobeOptionLocked(
  slot: WardrobeSlot,
  appearanceId: string,
  purchases: Readonly<Record<string, number>>,
): boolean {
  const item = getWardrobeItemFor(slot, appearanceId);
  return item !== undefined && !isWardrobeItemOwned(item, purchases);
}

export function isFreeWardrobeOption(slot: WardrobeSlot, appearanceId: string): boolean {
  const item = getWardrobeItemFor(slot, appearanceId);
  return item === undefined || item.price === 0;
}

export function equippedWardrobeItemIds(look: CharacterLook): string[] {
  const ids = [
    wardrobeItemId('hair', look.hair),
    wardrobeItemId('hairColor', look.hairColor),
    wardrobeItemId('eyes', look.eyes),
    wardrobeItemId('mouth', look.mouth),
    wardrobeItemId('outfit', look.outfit),
    wardrobeItemId('outfitColor', look.outfitColor),
  ];
  if (look.accessory) {
    ids.push(wardrobeItemId('accessory', look.accessory));
  }
  return ids.filter((id) => getItem(id)?.category === 'wardrobe');
}

export function seedEquippedWardrobePurchases(
  purchases: Record<string, number>,
  look: CharacterLook | null,
): void {
  if (!look) {
    return;
  }

  for (const itemId of equippedWardrobeItemIds(look)) {
    const item = getItem(itemId);
    if (item && item.price > 0 && (purchases[itemId] ?? 0) === 0) {
      purchases[itemId] = 1;
    }
  }
}

export function applyWardrobeItem(look: CharacterLook, item: ItemDefinition): CharacterLook {
  if (!item.wardrobeSlot || !item.appearanceId) {
    return look;
  }

  switch (item.wardrobeSlot) {
    case 'hair':
      return { ...look, hair: item.appearanceId };
    case 'hairColor':
      return { ...look, hairColor: item.appearanceId };
    case 'eyes':
      return { ...look, eyes: item.appearanceId };
    case 'mouth':
      return { ...look, mouth: item.appearanceId };
    case 'outfit':
      return { ...look, outfit: item.appearanceId };
    case 'outfitColor':
      return { ...look, outfitColor: item.appearanceId };
    case 'accessory':
      return { ...look, accessory: item.appearanceId };
    default:
      return look;
  }
}
