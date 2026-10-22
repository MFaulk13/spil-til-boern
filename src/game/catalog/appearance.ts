import { text } from '@/game/text';
import type { CharacterLook, Gender } from '@/game/types';

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

export interface GenderOption {
  id: Gender;
  label: string;
  assetKey: string;
  bodyAssetKey: string;
}

export const GENDER_STYLES: readonly GenderOption[] = [
  {
    id: 'boy',
    label: text.appearance.genders.boy,
    assetKey: 'icon-boy',
    bodyAssetKey: 'body-base',
  },
  {
    id: 'girl',
    label: text.appearance.genders.girl,
    assetKey: 'icon-girl',
    bodyAssetKey: 'body-girl',
  },
];

export const SKIN_TONES: readonly ColorOption[] = [
  { id: 'light', label: text.appearance.skinTones.light, color: 0xffe0c7 },
  { id: 'medium', label: text.appearance.skinTones.medium, color: 0xf2b98c },
  { id: 'tan', label: text.appearance.skinTones.tan, color: 0xc9865a },
  { id: 'warm', label: text.appearance.skinTones.warm, color: 0xe8a679 },
  { id: 'olive', label: text.appearance.skinTones.olive, color: 0xb07a55 },
  { id: 'dark', label: text.appearance.skinTones.dark, color: 0x8a5a3b },
];

export const HAIR_STYLES: readonly StyleOption[] = [
  { id: 'short', label: text.appearance.hairStyles.short, assetKey: 'hair-short' },
  { id: 'long', label: text.appearance.hairStyles.long, assetKey: 'hair-long' },
  { id: 'curly', label: text.appearance.hairStyles.curly, assetKey: 'hair-curly' },
  { id: 'bun', label: text.appearance.hairStyles.bun, assetKey: 'hair-bun' },
  { id: 'braid', label: text.appearance.hairStyles.braid, assetKey: 'hair-braid' },
  { id: 'ponytail', label: text.appearance.hairStyles.ponytail, assetKey: 'hair-ponytail' },
  { id: 'pigtails', label: text.appearance.hairStyles.pigtails, assetKey: 'hair-pigtails' },
  { id: 'bob', label: text.appearance.hairStyles.bob, assetKey: 'hair-bob' },
  { id: 'mohawk', label: text.appearance.hairStyles.mohawk, assetKey: 'hair-mohawk' },
  { id: 'afro', label: text.appearance.hairStyles.afro, assetKey: 'hair-afro' },
  { id: 'wavy', label: text.appearance.hairStyles.wavy, assetKey: 'hair-wavy' },
];

export const HAIR_COLORS: readonly ColorOption[] = [
  { id: 'brown', label: text.appearance.hairColors.brown, color: 0x7a4a2a },
  { id: 'black', label: text.appearance.hairColors.black, color: 0x2f2a2a },
  { id: 'blonde', label: text.appearance.hairColors.blonde, color: 0xf0cf7a },
  { id: 'red', label: text.appearance.hairColors.red, color: 0xc75b3a },
  { id: 'blue', label: text.appearance.hairColors.blue, color: 0x5a8fc9 },
  { id: 'purple', label: text.appearance.hairColors.purple, color: 0x8b6bb5 },
  { id: 'orange', label: text.appearance.hairColors.orange, color: 0xd98a4a },
  { id: 'pink', label: text.appearance.hairColors.pink, color: 0xe08fb8 },
  { id: 'mint', label: text.appearance.hairColors.mint, color: 0x7fd6c2 },
  { id: 'silver', label: text.appearance.hairColors.silver, color: 0xc9c9d4 },
];

export const EYE_STYLES: readonly StyleOption[] = [
  { id: 'round', label: text.appearance.eyeStyles.round, assetKey: 'eyes-round' },
  { id: 'sparkle', label: text.appearance.eyeStyles.sparkle, assetKey: 'eyes-sparkle' },
  { id: 'sleepy', label: text.appearance.eyeStyles.sleepy, assetKey: 'eyes-sleepy' },
  { id: 'star', label: text.appearance.eyeStyles.star, assetKey: 'eyes-star' },
  { id: 'wink', label: text.appearance.eyeStyles.wink, assetKey: 'eyes-wink' },
  { id: 'happy', label: text.appearance.eyeStyles.happy, assetKey: 'eyes-happy' },
  { id: 'heart', label: text.appearance.eyeStyles.heart, assetKey: 'eyes-heart' },
  { id: 'cool', label: text.appearance.eyeStyles.cool, assetKey: 'eyes-cool' },
  { id: 'curious', label: text.appearance.eyeStyles.curious, assetKey: 'eyes-curious' },
];

export const MOUTH_STYLES: readonly StyleOption[] = [
  { id: 'smile', label: text.appearance.mouthStyles.smile, assetKey: 'mouth-smile' },
  { id: 'grin', label: text.appearance.mouthStyles.grin, assetKey: 'mouth-grin' },
  { id: 'open', label: text.appearance.mouthStyles.open, assetKey: 'mouth-open' },
  { id: 'tongue', label: text.appearance.mouthStyles.tongue, assetKey: 'mouth-tongue' },
  { id: 'shy', label: text.appearance.mouthStyles.shy, assetKey: 'mouth-shy' },
  { id: 'smirk', label: text.appearance.mouthStyles.smirk, assetKey: 'mouth-smirk' },
  { id: 'laugh', label: text.appearance.mouthStyles.laugh, assetKey: 'mouth-laugh' },
  {
    id: 'surprised',
    label: text.appearance.mouthStyles.surprised,
    assetKey: 'mouth-surprised',
  },
  { id: 'cat', label: text.appearance.mouthStyles.cat, assetKey: 'mouth-cat' },
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
  { id: 'jacket', label: text.appearance.outfitStyles.jacket, assetKey: 'outfit-jacket' },
  { id: 'tank', label: text.appearance.outfitStyles.tank, assetKey: 'outfit-tank' },
  { id: 'pajamas', label: text.appearance.outfitStyles.pajamas, assetKey: 'outfit-pajamas' },
  {
    id: 'princess',
    label: text.appearance.outfitStyles.princess,
    assetKey: 'outfit-princess',
  },
  {
    id: 'superhero',
    label: text.appearance.outfitStyles.superhero,
    assetKey: 'outfit-superhero',
  },
  { id: 'apron', label: text.appearance.outfitStyles.apron, assetKey: 'outfit-apron' },
  { id: 'kimono', label: text.appearance.outfitStyles.kimono, assetKey: 'outfit-kimono' },
  { id: 'poncho', label: text.appearance.outfitStyles.poncho, assetKey: 'outfit-poncho' },
  { id: 'vest', label: text.appearance.outfitStyles.vest, assetKey: 'outfit-vest' },
  {
    id: 'tracksuit',
    label: text.appearance.outfitStyles.tracksuit,
    assetKey: 'outfit-tracksuit',
  },
];

export const OUTFIT_COLORS: readonly ColorOption[] = [
  { id: 'teal', label: text.appearance.outfitColors.teal, color: 0x5bc4b0 },
  { id: 'coral', label: text.appearance.outfitColors.coral, color: 0xff8b7d },
  { id: 'yellow', label: text.appearance.outfitColors.yellow, color: 0xffd166 },
  { id: 'blue', label: text.appearance.outfitColors.blue, color: 0x7fb3e8 },
  { id: 'pink', label: text.appearance.outfitColors.pink, color: 0xf3a6c8 },
  { id: 'green', label: text.appearance.outfitColors.green, color: 0x8fd18a },
  { id: 'orange', label: text.appearance.outfitColors.orange, color: 0xffa552 },
  { id: 'mint', label: text.appearance.outfitColors.mint, color: 0x8fd6c0 },
  { id: 'lavender', label: text.appearance.outfitColors.lavender, color: 0xc9b2e8 },
  { id: 'navy', label: text.appearance.outfitColors.navy, color: 0x4f6699 },
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
  { id: 'beanie', label: text.appearance.accessories.beanie, assetKey: 'accessory-beanie' },
  { id: 'flower', label: text.appearance.accessories.flower, assetKey: 'accessory-flower' },
  {
    id: 'crown',
    label: text.appearance.accessories.crown,
    assetKey: 'accessory-crown-character',
  },
  {
    id: 'earrings',
    label: text.appearance.accessories.earrings,
    assetKey: 'accessory-earrings',
  },
  {
    id: 'starGlasses',
    label: text.appearance.accessories.starGlasses,
    assetKey: 'accessory-star-glasses',
  },
  { id: 'mask', label: text.appearance.accessories.mask, assetKey: 'accessory-mask' },
  {
    id: 'necklace',
    label: text.appearance.accessories.necklace,
    assetKey: 'accessory-necklace',
  },
  {
    id: 'backpack',
    label: text.appearance.accessories.backpack,
    assetKey: 'accessory-backpack',
  },
  {
    id: 'catEars',
    label: text.appearance.accessories.catEars,
    assetKey: 'accessory-cat-ears',
  },
  { id: 'sunhat', label: text.appearance.accessories.sunhat, assetKey: 'accessory-sunhat' },
];

export const DEFAULT_LOOK: CharacterLook = {
  gender: 'boy',
  skin: 'medium',
  hair: 'short',
  hairColor: 'brown',
  eyes: 'round',
  mouth: 'smile',
  outfit: 'tshirt',
  outfitColor: 'teal',
  accessory: null,
};

export type AppearanceCategory =
  'gender' | 'skin' | 'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessory';

export const APPEARANCE_CATEGORIES: readonly AppearanceCategory[] = [
  'gender',
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
