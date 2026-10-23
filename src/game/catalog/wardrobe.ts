import type { WardrobeSlot } from '@/game/types';

const SLOT_PREFIXES: Record<WardrobeSlot, string> = {
  hair: 'hair',
  hairColor: 'hair-color',
  eyes: 'eyes',
  mouth: 'mouth',
  outfit: 'outfit',
  outfitColor: 'outfit-color',
  accessory: 'accessory',
};

export const QUICK_START_EYES: readonly string[] = ['round', 'sparkle', 'happy'];

export const QUICK_START_MOUTHS: readonly string[] = ['smile', 'open', 'grin'];

export function wardrobeItemId(slot: WardrobeSlot, appearanceId: string): string {
  return `${SLOT_PREFIXES[slot]}-${appearanceId}`;
}
