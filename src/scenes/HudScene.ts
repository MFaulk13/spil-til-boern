import Phaser from 'phaser';
import { getPet } from '@/game/catalog/pets';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { CARE_NEEDS, type CareNeed } from '@/game/types';
import {
  GAME_EVENTS,
  gameEvents,
  type CareFeedback,
  type HudState,
  type PlacementState,
} from '@/systems/events';
import { isReducedMotion } from '@/systems/motion';
import { moodOf, type CareAction } from '@/systems/pet';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { NeedBar } from '@/ui/NeedBar';
import { COLORS, FONT_FAMILY, MOOD_COLORS, CARE_COLORS } from '@/ui/theme';

const CARE_LAYOUT: readonly {
  action: CareAction;
  icon: string;
  x: number;
  width: number;
}[] = [
  { action: 'feed', icon: 'icon-hunger', x: 160, width: 168 },
  { action: 'play', icon: 'icon-joy', x: 338, width: 168 },
  { action: 'pet', icon: 'icon-paw', x: 516, width: 168 },
  { action: 'sleep', icon: 'icon-energy', x: 694, width: 168 },
  { action: 'treat', icon: 'treat-cookie', x: 872, width: 168 },
];

const NEED_LAYOUT: readonly { need: CareNeed; x: number }[] = [
  { need: 'hunger', x: 270 },
  { need: 'joy', x: 460 },
  { need: 'energy', x: 640 },
];

export class HudScene extends Phaser.Scene {
  private readonly bars = new Map<CareNeed, NeedBar>();
  private nameText?: Phaser.GameObjects.Text;
  private moodText?: Phaser.GameObjects.Text;
  private heartsText?: Phaser.GameObjects.Text;
  private lastHearts?: number;
  private decorButton?: Button;
  private treatButton?: Button;
  private treatCount = 0;
  private placementActive = false;
  private readonly careButtons: Button[] = [];

  constructor() {
    super(SCENE_KEYS.HUD);
  }

  create(): void {
    const pet = save.pet;
    if (!pet) {
      this.scene.stop();
      return;
    }

    this.bars.clear();
    this.lastHearts = undefined;
    this.careButtons.length = 0;
    this.decorButton = undefined;
    this.treatButton = undefined;
    this.treatCount = 0;
    this.placementActive = false;
    this.createTopPanel(pet.id, pet.name);
    this.createBottomPanel();

    for (const layout of NEED_LAYOUT) {
      const bar = new NeedBar(this, layout.x, 74, 175, layout.need, pet.needs[layout.need]);
      this.bars.set(layout.need, bar);
    }

    this.moodText?.setText(text.mood[moodOf(pet.needs)]);
    this.applyState({
      petId: pet.id,
      petName: pet.name,
      needs: pet.needs,
      hearts: save.hearts,
      mood: moodOf(pet.needs),
      treatCount: 0,
      petCount: save.pets.length,
    });

    gameEvents.on(GAME_EVENTS.HUD_STATE, this.applyState, this);
    gameEvents.on(GAME_EVENTS.CARE_FEEDBACK, this.handleFeedback, this);
    gameEvents.on(GAME_EVENTS.PLACEMENT_STATE, this.handlePlacementState, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    gameEvents.emit(GAME_EVENTS.HUD_READY);
  }

  private createTopPanel(petId: HudState['petId'], petName: string): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.94);
    panel.fillRoundedRect(10, 8, GAME_WIDTH - 20, 108, 28);
    panel.lineStyle(4, COLORS.accent, 0.55);
    panel.strokeRoundedRect(10, 8, GAME_WIDTH - 20, 108, 28);

    const portrait = this.add.graphics();
    portrait.fillStyle(COLORS.teal, 0.22);
    portrait.fillCircle(72, 62, 43);
    portrait.lineStyle(4, COLORS.teal, 0.8);
    portrait.strokeCircle(72, 62, 43);

    const pet = getPet(petId);
    if (this.textures.exists(pet.assetKey)) {
      this.add.image(72, 66, pet.assetKey).setDisplaySize(72, 72);
    }

    this.nameText = this.add
      .text(128, 50, petName, {
        fontFamily: FONT_FAMILY,
        fontSize: '27px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.moodText = this.add
      .text(128, 82, text.mood.happy, {
        fontFamily: FONT_FAMILY,
        fontSize: '19px',
        color: MOOD_COLORS.happy,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add.image(840, 66, 'icon-heart').setDisplaySize(36, 36);
    this.heartsText = this.add
      .text(864, 66, String(save.hearts), {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    new Button(this, {
      x: 978,
      y: 62,
      label: text.hud.wardrobe,
      iconKey: 'icon-hanger',
      iconSize: 26,
      width: 124,
      height: 72,
      fontSize: 21,
      color: COLORS.lavender,
      textColor: COLORS.text,
      hitPadding: 4,
      onClick: () => gameEvents.emit(GAME_EVENTS.WARDROBE_REQUESTED),
    });

    new Button(this, {
      x: 1098,
      y: 62,
      label: text.hud.pets,
      iconKey: 'icon-paw',
      iconSize: 26,
      width: 110,
      height: 72,
      fontSize: 21,
      color: COLORS.accent,
      textColor: COLORS.text,
      hitPadding: 4,
      onClick: () => gameEvents.emit(GAME_EVENTS.PETS_REQUESTED),
    });

    new Button(this, {
      x: 1218,
      y: 62,
      label: text.hud.menu,
      width: 100,
      height: 72,
      fontSize: 21,
      color: COLORS.teal,
      hitPadding: 4,
      onClick: () => gameEvents.emit(GAME_EVENTS.MENU_REQUESTED),
    });
  }

  private createBottomPanel(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.95);
    panel.fillRoundedRect(10, 610, GAME_WIDTH - 20, 102, 28);
    panel.lineStyle(4, COLORS.accent, 0.5);
    panel.strokeRoundedRect(10, 610, GAME_WIDTH - 20, 102, 28);

    for (const item of CARE_LAYOUT) {
      const button = new Button(this, {
        x: item.x,
        y: 661,
        label: text.care[item.action],
        iconKey: item.icon,
        iconSize: 40,
        width: item.width,
        height: 96,
        fontSize: 26,
        color: CARE_COLORS[item.action],
        onClick: () => gameEvents.emit(GAME_EVENTS.CARE_REQUESTED, item.action),
      });
      if (item.action === 'treat') {
        this.treatButton = button;
        button.setEnabled(false);
      }
      this.careButtons.push(button);
    }

    new Button(this, {
      x: 1025,
      y: 661,
      label: text.hud.town,
      iconKey: 'icon-shop',
      iconSize: 30,
      width: 110,
      height: 96,
      fontSize: 24,
      color: COLORS.teal,
      onClick: () => gameEvents.emit(GAME_EVENTS.TOWN_REQUESTED),
    });

    this.decorButton = new Button(this, {
      x: 1179,
      y: 661,
      label: text.hud.decor,
      iconKey: 'icon-paint',
      iconSize: 30,
      width: 178,
      height: 96,
      fontSize: 24,
      color: COLORS.lavender,
      textColor: COLORS.textDark,
      onClick: () => gameEvents.emit(GAME_EVENTS.DECOR_REQUESTED),
    });
  }

  private handlePlacementState(state: PlacementState): void {
    this.placementActive = state.active;
    for (const button of this.careButtons) {
      button.setEnabled(!state.active);
    }
    this.treatButton?.setEnabled(!state.active && this.treatCount > 0);
    this.decorButton?.setLabel(state.active ? text.hud.decorDone : text.hud.decor);
    this.decorButton?.setColor(state.active ? COLORS.primary : COLORS.lavender);
  }

  private applyState(state: HudState): void {
    for (const need of CARE_NEEDS) {
      this.bars.get(need)?.setValue(state.needs[need]);
    }

    this.nameText?.setText(state.petName);
    this.moodText?.setText(text.mood[state.mood]);
    this.moodText?.setColor(MOOD_COLORS[state.mood]);

    if (
      !isReducedMotion() &&
      this.lastHearts !== undefined &&
      state.hearts !== this.lastHearts &&
      this.heartsText
    ) {
      this.tweens.add({
        targets: this.heartsText,
        scale: 1.18,
        duration: 120,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    this.treatCount = state.treatCount;
    this.treatButton?.setEnabled(!this.placementActive && state.treatCount > 0);
    this.lastHearts = state.hearts;
    this.heartsText?.setText(String(state.hearts));
  }

  private handleFeedback(feedback: CareFeedback): void {
    this.bars.get(feedback.need)?.pulse();

    if (feedback.hearts <= 0) {
      return;
    }

    const label = this.add
      .text(1082, 36, text.care.heartGain(feedback.hearts), {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);

    if (isReducedMotion()) {
      label.destroy();
      return;
    }

    this.tweens.add({
      targets: label,
      y: 18,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private handleShutdown(): void {
    gameEvents.off(GAME_EVENTS.HUD_STATE, this.applyState, this);
    gameEvents.off(GAME_EVENTS.CARE_FEEDBACK, this.handleFeedback, this);
    gameEvents.off(GAME_EVENTS.PLACEMENT_STATE, this.handlePlacementState, this);
  }
}
