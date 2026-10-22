import accessoryBowUrl from '@/assets/character/accessory-bow.svg';
import accessoryCapUrl from '@/assets/character/accessory-cap.svg';
import accessoryGlassesUrl from '@/assets/character/accessory-glasses.svg';
import accessoryHeadphonesUrl from '@/assets/character/accessory-headphones.svg';
import bodyBaseUrl from '@/assets/character/body-base.svg';
import eyesRoundUrl from '@/assets/character/eyes-round.svg';
import eyesSleepyUrl from '@/assets/character/eyes-sleepy.svg';
import eyesSparkleUrl from '@/assets/character/eyes-sparkle.svg';
import eyesStarUrl from '@/assets/character/eyes-star.svg';
import eyesWinkUrl from '@/assets/character/eyes-wink.svg';
import hairBraidUrl from '@/assets/character/hair-braid.svg';
import hairBunUrl from '@/assets/character/hair-bun.svg';
import hairCurlyUrl from '@/assets/character/hair-curly.svg';
import hairLongUrl from '@/assets/character/hair-long.svg';
import hairShortUrl from '@/assets/character/hair-short.svg';
import mouthGrinUrl from '@/assets/character/mouth-grin.svg';
import mouthOpenUrl from '@/assets/character/mouth-open.svg';
import mouthShyUrl from '@/assets/character/mouth-shy.svg';
import mouthSmileUrl from '@/assets/character/mouth-smile.svg';
import mouthTongueUrl from '@/assets/character/mouth-tongue.svg';
import outfitDressUrl from '@/assets/character/outfit-dress.svg';
import outfitHoodieUrl from '@/assets/character/outfit-hoodie.svg';
import outfitOverallsUrl from '@/assets/character/outfit-overalls.svg';
import outfitShirtUrl from '@/assets/character/outfit-shirt.svg';
import outfitTshirtUrl from '@/assets/character/outfit-tshirt.svg';
import furnitureBedUrl from '@/assets/furniture/furniture-bed.svg';
import furnitureChairUrl from '@/assets/furniture/furniture-chair.svg';
import furnitureLampUrl from '@/assets/furniture/furniture-lamp.svg';
import furniturePlantUrl from '@/assets/furniture/furniture-plant.svg';
import furnitureRugUrl from '@/assets/furniture/furniture-rug.svg';
import furnitureShelfUrl from '@/assets/furniture/furniture-shelf.svg';
import furnitureSofaUrl from '@/assets/furniture/furniture-sofa.svg';
import furnitureTableUrl from '@/assets/furniture/furniture-table.svg';
import furnitureWardrobeUrl from '@/assets/furniture/furniture-wardrobe.svg';
import accessoryBandanaUrl from '@/assets/items/accessory-bandana.svg';
import accessoryBowItemUrl from '@/assets/items/accessory-bow-item.svg';
import accessoryCrownUrl from '@/assets/items/accessory-crown.svg';
import treatCarrotUrl from '@/assets/items/treat-carrot.svg';
import treatCookieUrl from '@/assets/items/treat-cookie.svg';
import eggBaseUrl from '@/assets/eggs/egg-base.svg';
import eggSpotsUrl from '@/assets/eggs/egg-spots.svg';
import eggStripesUrl from '@/assets/eggs/egg-stripes.svg';
import eggWavesUrl from '@/assets/eggs/egg-waves.svg';
import petAxolotlUrl from '@/assets/pets/pet-axolotl.svg';
import petCatUrl from '@/assets/pets/pet-cat.svg';
import petDogUrl from '@/assets/pets/pet-dog.svg';
import petFishUrl from '@/assets/pets/pet-fish.svg';
import petHorseUrl from '@/assets/pets/pet-horse.svg';
import petKittenUrl from '@/assets/pets/pet-kitten.svg';
import petPuppyUrl from '@/assets/pets/pet-puppy.svg';
import petRabbitUrl from '@/assets/pets/pet-rabbit.svg';
import petTurtleUrl from '@/assets/pets/pet-turtle.svg';
import roomBedroomUrl from '@/assets/rooms/room-bedroom.svg';
import roomLivingUrl from '@/assets/rooms/room-living.svg';
import parkUrl from '@/assets/town/park.svg';
import shopRoomUrl from '@/assets/town/shop-room.svg';
import townMapUrl from '@/assets/town/town-map.svg';
import toyBallUrl from '@/assets/toys/toy-ball.svg';
import toyScratchingPostUrl from '@/assets/toys/toy-scratching-post.svg';
import toyTeddyUrl from '@/assets/toys/toy-teddy.svg';
import iconCheckUrl from '@/assets/ui/icon-check.svg';
import iconDiceUrl from '@/assets/ui/icon-dice.svg';
import iconEnergyUrl from '@/assets/ui/icon-energy.svg';
import iconHeartUrl from '@/assets/ui/icon-heart.svg';
import iconHungerUrl from '@/assets/ui/icon-hunger.svg';
import iconHomeUrl from '@/assets/ui/icon-home.svg';
import iconJoyUrl from '@/assets/ui/icon-joy.svg';
import iconPaintUrl from '@/assets/ui/icon-paint.svg';
import iconParkUrl from '@/assets/ui/icon-park.svg';
import iconPawUrl from '@/assets/ui/icon-paw.svg';
import iconShopUrl from '@/assets/ui/icon-shop.svg';
import iconStarUrl from '@/assets/ui/icon-star.svg';
import iconTapUrl from '@/assets/ui/icon-tap.svg';
import iconTrashUrl from '@/assets/ui/icon-trash.svg';

export interface AssetEntry {
  key: string;
  url: string;
  width: number;
  height: number;
}

function character(key: string, url: string): AssetEntry {
  return { key, url, width: 384, height: 384 };
}

function pet(key: string, url: string): AssetEntry {
  return { key, url, width: 384, height: 384 };
}

function egg(key: string, url: string): AssetEntry {
  return { key, url, width: 256, height: 320 };
}

function icon(key: string, url: string): AssetEntry {
  return { key, url, width: 96, height: 96 };
}

export const ASSET_MANIFEST: readonly AssetEntry[] = [
  character('body-base', bodyBaseUrl),
  character('hair-short', hairShortUrl),
  character('hair-long', hairLongUrl),
  character('hair-curly', hairCurlyUrl),
  character('hair-bun', hairBunUrl),
  character('hair-braid', hairBraidUrl),
  character('eyes-round', eyesRoundUrl),
  character('eyes-sparkle', eyesSparkleUrl),
  character('eyes-sleepy', eyesSleepyUrl),
  character('eyes-star', eyesStarUrl),
  character('eyes-wink', eyesWinkUrl),
  character('mouth-smile', mouthSmileUrl),
  character('mouth-grin', mouthGrinUrl),
  character('mouth-open', mouthOpenUrl),
  character('mouth-tongue', mouthTongueUrl),
  character('mouth-shy', mouthShyUrl),
  character('outfit-tshirt', outfitTshirtUrl),
  character('outfit-dress', outfitDressUrl),
  character('outfit-overalls', outfitOverallsUrl),
  character('outfit-hoodie', outfitHoodieUrl),
  character('outfit-shirt', outfitShirtUrl),
  character('accessory-glasses', accessoryGlassesUrl),
  character('accessory-cap', accessoryCapUrl),
  character('accessory-bow', accessoryBowUrl),
  character('accessory-headphones', accessoryHeadphonesUrl),
  egg('egg-base', eggBaseUrl),
  egg('egg-spots', eggSpotsUrl),
  egg('egg-stripes', eggStripesUrl),
  egg('egg-waves', eggWavesUrl),
  pet('pet-dog', petDogUrl),
  pet('pet-puppy', petPuppyUrl),
  pet('pet-cat', petCatUrl),
  pet('pet-kitten', petKittenUrl),
  pet('pet-rabbit', petRabbitUrl),
  pet('pet-horse', petHorseUrl),
  pet('pet-fish', petFishUrl),
  pet('pet-turtle', petTurtleUrl),
  pet('pet-axolotl', petAxolotlUrl),
  { key: 'room-living', url: roomLivingUrl, width: 1280, height: 720 },
  { key: 'room-bedroom', url: roomBedroomUrl, width: 1280, height: 720 },
  { key: 'town-map', url: townMapUrl, width: 1280, height: 720 },
  { key: 'shop-room', url: shopRoomUrl, width: 1280, height: 720 },
  { key: 'park', url: parkUrl, width: 1280, height: 720 },
  { key: 'furniture-sofa', url: furnitureSofaUrl, width: 256, height: 128 },
  { key: 'furniture-chair', url: furnitureChairUrl, width: 128, height: 128 },
  { key: 'furniture-table', url: furnitureTableUrl, width: 128, height: 128 },
  { key: 'furniture-rug', url: furnitureRugUrl, width: 192, height: 128 },
  { key: 'furniture-bed', url: furnitureBedUrl, width: 256, height: 192 },
  { key: 'furniture-shelf', url: furnitureShelfUrl, width: 128, height: 192 },
  { key: 'furniture-lamp', url: furnitureLampUrl, width: 64, height: 128 },
  { key: 'furniture-plant', url: furniturePlantUrl, width: 64, height: 128 },
  { key: 'furniture-wardrobe', url: furnitureWardrobeUrl, width: 128, height: 192 },
  { key: 'toy-ball', url: toyBallUrl, width: 64, height: 64 },
  { key: 'toy-teddy', url: toyTeddyUrl, width: 64, height: 128 },
  { key: 'toy-scratching-post', url: toyScratchingPostUrl, width: 128, height: 192 },
  { key: 'accessory-bow-item', url: accessoryBowItemUrl, width: 96, height: 96 },
  { key: 'accessory-crown', url: accessoryCrownUrl, width: 96, height: 96 },
  { key: 'accessory-bandana', url: accessoryBandanaUrl, width: 96, height: 96 },
  { key: 'treat-cookie', url: treatCookieUrl, width: 96, height: 96 },
  { key: 'treat-carrot', url: treatCarrotUrl, width: 96, height: 96 },
  icon('icon-home', iconHomeUrl),
  icon('icon-shop', iconShopUrl),
  icon('icon-park', iconParkUrl),
  icon('icon-paint', iconPaintUrl),
  icon('icon-trash', iconTrashUrl),
  icon('icon-heart', iconHeartUrl),
  icon('icon-hunger', iconHungerUrl),
  icon('icon-joy', iconJoyUrl),
  icon('icon-energy', iconEnergyUrl),
  icon('icon-dice', iconDiceUrl),
  icon('icon-tap', iconTapUrl),
  icon('icon-paw', iconPawUrl),
  icon('icon-star', iconStarUrl),
  icon('icon-check', iconCheckUrl),
];
