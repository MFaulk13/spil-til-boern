import { text } from '@/game/text';
import type { CharacterLook } from '@/game/types';

export interface ColorOption {
  id: string;
  label: string;
  color: number;
}

export interface StyleOption {
  id: string;
  label: string;
  assetKey: string;
}

export const SKIN_TONES: readonly ColorOption[] = [
  { id: 'light', label: text.appearance.skinTones.light, color: 0xffe0c7 },
  { id: 'medium', label: text.appearance.skinTones.medium, color: 0xf2b98c },
  { id: 'tan', label: text.appearance.skinTones.tan, color: 0xc9865a },
  { id: 'dark', label: text.appearance.skinTones.dark, color: 0x8a5a3b },
];

export const HAIR_STYLES: readonly StyleOption[] = [
  { id: 'short', label: text.appearance.hairStyles.short, assetKey: 'hair-short' },
  { id: 'long', label: text.appearance.hairStyles.long, assetKey: 'hair-long' },
  { id: 'curly', label: text.appearance.hairStyles.curly, assetKey: 'hair-curly' },
  { id: 'bun', label: text.appearance.hairStyles.bun, assetKey: 'hair-bun' },
  { id: 'braid', label: text.appearance.hairStyles.braid, assetKey: 'hair-braid' },
];

export const HAIR_COLORS: readonly ColorOption[] = [
  { id: 'brown', label: text.appearance.hairColors.brown, color: 0x7a4a2a },
  { id: 'black', label: text.appearance.hairColors.black, color: 0x2f2a2a },
  { id: 'blonde', label: text.appearance.hairColors.blonde, color: 0xf0cf7a },
  { id: 'red', label: text.appearance.hairColors.red, color: 0xc75b3a },
  { id: 'blue', label: text.appearance.hairColors.blue, color: 0x5a8fc9 },
  { id: 'purple', label: text.appearance.hairColors.purple, color: 0x8b6bb5 },
];

export const EYE_STYLES: readonly StyleOption[] = [
  { id: 'round', label: text.appearance.eyeStyles.round, assetKey: 'eyes-round' },
  { id: 'sparkle', label: text.appearance.eyeStyles.sparkle, assetKey: 'eyes-sparkle' },
  { id: 'sleepy', label: text.appearance.eyeStyles.sleepy, assetKey: 'eyes-sleepy' },
  { id: 'star', label: text.appearance.eyeStyles.star, assetKey: 'eyes-star' },
  { id: 'wink', label: text.appearance.eyeStyles.wink, assetKey: 'eyes-wink' },
];

export const MOUTH_STYLES: readonly StyleOption[] = [
  { id: 'smile', label: text.appearance.mouthStyles.smile, assetKey: 'mouth-smile' },
  { id: 'grin', label: text.appearance.mouthStyles.grin, assetKey: 'mouth-grin' },
  { id: 'open', label: text.appearance.mouthStyles.open, assetKey: 'mouth-open' },
  { id: 'tongue', label: text.appearance.mouthStyles.tongue, assetKey: 'mouth-tongue' },
  { id: 'shy', label: text.appearance.mouthStyles.shy, assetKey: 'mouth-shy' },
];

export const OUTFIT_STYLES: readonly StyleOption[] = [
  { id: 'tshirt', label: text.appearance.outfitStyles.tshirt, assetKey: 'outfit-tshirt' },
  { id: 'dress', label: text.appearance.outfitStyles.dress, assetKey: 'outfit-dress' },
  {
    id: 'overalls',
    label: text.appearance.outfitStyles.overalls,
    assetKey: 'outfit-overalls',
  },
  { id: 'hoodie', label: text.appearance.outfitStyles.hoodie, assetKey: 'outfit-hoodie' },
  { id: 'shirt', label: text.appearance.outfitStyles.shirt, assetKey: 'outfit-shirt' },
  { id: 'sweater', label: text.appearance.outfitStyles.sweater, assetKey: 'outfit-sweater' },
  { id: 'raincoat', label: text.appearance.outfitStyles.raincoat, assetKey: 'outfit-raincoat' },
];

export const OUTFIT_COLORS: readonly ColorOption[] = [
  { id: 'teal', label: text.appearance.outfitColors.teal, color: 0x5bc4b0 },
  { id: 'coral', label: text.appearance.outfitColors.coral, color: 0xff8b7d },
  { id: 'yellow', label: text.appearance.outfitColors.yellow, color: 0xffd166 },
  { id: 'blue', label: text.appearance.outfitColors.blue, color: 0x7fb3e8 },
  { id: 'pink', label: text.appearance.outfitColors.pink, color: 0xf3a6c8 },
  { id: 'green', label: text.appearance.outfitColors.green, color: 0x8fd18a },
];

export const ACCESSORY_STYLES: readonly StyleOption[] = [
  { id: 'none', label: text.appearance.accessories.none, assetKey: '' },
  { id: 'glasses', label: text.appearance.accessories.glasses, assetKey: 'accessory-glasses' },
  { id: 'cap', label: text.appearance.accessories.cap, assetKey: 'accessory-cap' },
  { id: 'bow', label: text.appearance.accessories.bow, assetKey: 'accessory-bow' },
  {
    id: 'headphones',
    label: text.appearance.accessories.headphones,
    assetKey: 'accessory-headphones',
  },
  {
    id: 'scarf',
    label: text.appearance.accessories.scarf,
    assetKey: 'accessory-character-scarf',
  },
];

export const DEFAULT_LOOK: CharacterLook = {
  skin: 'medium',
  hair: 'short',
  hairColor: 'brown',
  eyes: 'round',
  mouth: 'smile',
  outfit: 'tshirt',
  outfitColor: 'teal',
  accessory: null,
};

export type AppearanceCategory = 'skin' | 'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessory';

export const APPEARANCE_CATEGORIES: readonly AppearanceCategory[] = [
  'skin',
  'hair',
  'eyes',
  'mouth',
  'outfit',
  'accessory',
];

export function findColor(options: readonly ColorOption[], id: string): ColorOption {
  return options.find((option) => option.id === id) ?? options[0];
}

export function findStyle(options: readonly StyleOption[], id: string): StyleOption {
  return options.find((option) => option.id === id) ?? options[0];
}
