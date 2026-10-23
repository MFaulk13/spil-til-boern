import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import { BootScene } from '@/scenes/BootScene';
import { CharacterScene } from '@/scenes/CharacterScene';
import { HatchScene } from '@/scenes/HatchScene';
import { HomeScene } from '@/scenes/HomeScene';
import { HudScene } from '@/scenes/HudScene';
import { MenuScene } from '@/scenes/MenuScene';
import { ParkScene } from '@/scenes/ParkScene';
import { PetSelectScene } from '@/scenes/PetSelectScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { ProfileScene } from '@/scenes/ProfileScene';
import { QuizScene } from '@/scenes/QuizScene';
import { SchoolScene } from '@/scenes/SchoolScene';
import { ShopScene } from '@/scenes/ShopScene';
import { TownScene } from '@/scenes/TownScene';
import { COLORS } from '@/ui/theme';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.background,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    input: {
      activePointers: 3,
    },
    scene: [
      BootScene,
      PreloadScene,
      ProfileScene,
      MenuScene,
      CharacterScene,
      PetSelectScene,
      HatchScene,
      HomeScene,
      TownScene,
      ShopScene,
      ParkScene,
      SchoolScene,
      QuizScene,
      HudScene,
    ],
  };
}
