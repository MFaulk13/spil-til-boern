import Phaser from 'phaser';
import { firstTreatId, getItem, treatCount, type ItemDefinition } from '@/game/catalog/items';
import { getPet } from '@/game/catalog/pets';
import { getRoom, ROOMS, type RoomDefinition } from '@/game/catalog/rooms';
import { TALENTS, type TalentDefinition, type TalentId } from '@/game/catalog/talents';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { isHudDisabled } from '@/game/device';
import { text } from '@/game/text';
import type {
  CareNeed,
  HomeFixture,
  Needs,
  PetId,
  PlacedFurniture,
  Point,
  RoomId,
} from '@/game/types';
import { normalizeLook } from '@/systems/appearance';
import { isReducedMotion } from '@/systems/motion';
import { audio } from '@/systems/audio';
import {
  GAME_EVENTS,
  gameEvents,
  type CareFeedback,
  type GuideTargetState,
  type HudState,
  type PlacementState,
} from '@/systems/events';
import {
  applyHomeInteraction,
  guideTarget,
  homeGuideState,
  interactionForFixture,
  interactionForItem,
  nextGuideTask,
  wishForNeeds,
  type HomeGuideTask,
  type HomeInteraction,
} from '@/systems/home';
import {
  CARE_EFFECTS,
  applyCare,
  bondLevelIndex,
  isNeedLow,
  lowestNeed,
  moodOf,
  type CareAction,
  type Mood,
} from '@/systems/pet';
import { canPlace, clampCenter, createFurnitureUid, footprintOf } from '@/systems/placement';
import { save } from '@/systems/save';
import { currentSeasonTheme } from '@/systems/season';
import { speak } from '@/systems/speech';
import { CharacterView } from '@/ui/CharacterView';
import { HomeFixtures } from '@/ui/HomeFixtures';
import { InventoryPanel, type InventoryEntry } from '@/ui/InventoryPanel';
import { PetPanel, type PetPanelMode } from '@/ui/PetPanel';
import { PetView } from '@/ui/PetView';
import { applySeasonTheme } from '@/ui/SeasonDecor';
import { COLORS, FONT_FAMILY } from '@/ui/theme';
import { setTintableTexture } from '@/ui/tint';

const MOVE_SPEED = 330;
const PET_FOLLOW_GAP = 118;
const PET_FOLLOW_SPEED = 6;
const HUD_UPDATE_INTERVAL = 200;
const ACTION_COOLDOWN = 650;
const FURNITURE_COOLDOWN = 1200;
const AMBIENT_IDLE_DELAY = 14_000;
const GUIDE_HINT_DURATION = 5_200;

export class HomeScene extends Phaser.Scene {
  private character!: CharacterView;
  private petView!: PetView;
  private petId: PetId = 'dog';
  private petName = '';
  private needs: Needs = { hunger: 100, joy: 100, energy: 100 };
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private facingRight = true;
  private petFacingRight = true;
  private hudElapsed = 0;
  private talentReadyAt = 0;
  private actionReadyAt: Record<CareAction, number> = {
    feed: 0,
    play: 0,
    pet: 0,
    sleep: 0,
    treat: 0,
  };
  private fixtures?: HomeFixtures;
  private tutorialBanner?: Phaser.GameObjects.Container;
  private tutorialRing?: Phaser.GameObjects.Arc;
  private tutorialArrow?: Phaser.GameObjects.Container;
  private moodHeartsTimer?: Phaser.Time.TimerEvent;
  private ambientTimer?: Phaser.Time.TimerEvent;
  private guideHint?: Phaser.GameObjects.Container;
  private room: RoomDefinition = ROOMS.living;
  private roomBackground?: Phaser.GameObjects.Image;
  private readonly doorViews: Phaser.GameObjects.Container[] = [];
  private readonly furnitureViews = new Map<string, Phaser.GameObjects.Container>();
  private readonly interactiveFurniture = new Set<string>();
  private readonly roomPositions = new Map<RoomId, Point>();
  private readonly seenFurnitureHints = new Set<string>();
  private placementMode = false;
  private selectedUid: string | null = null;
  private selectedItemId: string | null = null;
  private ghost?: Phaser.GameObjects.Image;
  private inventoryPanel?: InventoryPanel;
  private placementHint?: Phaser.GameObjects.Text;
  private floorZone?: Phaser.GameObjects.Zone;
  private movementHint?: Phaser.GameObjects.Container;
  private speechBubble?: Phaser.GameObjects.Container;
  private petPanel?: PetPanel;
  private lastMood: Mood = 'okay';
  private petBusy = false;
  private petBusyToken = 0;
  private petWalkTween?: Phaser.Tweens.Tween;
  private furnitureReadyAt = 0;
  private transitioning = false;

  constructor() {
    super(SCENE_KEYS.HOME);
  }

  create(): void {
    const pet = save.pet;
    if (!pet) {
      this.scene.start(SCENE_KEYS.MENU);
      return;
    }

    this.petId = pet.id;
    this.petName = pet.name;
    this.needs = { ...pet.needs };
    this.moveTarget = null;
    this.hudElapsed = 0;
    this.talentReadyAt = 0;
    this.actionReadyAt = { feed: 0, play: 0, pet: 0, sleep: 0, treat: 0 };
    this.placementMode = false;
    this.selectedUid = null;
    this.selectedItemId = null;
    this.petPanel = undefined;
    this.room = getRoom('living');
    this.furnitureViews.clear();
    this.interactiveFurniture.clear();
    this.roomPositions.clear();
    this.seenFurnitureHints.clear();
    this.petBusy = false;
    this.petBusyToken = 0;
    this.petWalkTween = undefined;
    this.furnitureReadyAt = 0;
    this.transitioning = false;
    this.guideHint = undefined;

    this.roomBackground = this.add.image(GAME_WIDTH / 2, 360, this.room.assetKey).setDepth(-10);
    applySeasonTheme(this, currentSeasonTheme(), 'indoor');
    this.createFloorTrigger();
    this.createDoors();
    this.createFurnitureViews();
    this.fixtures = this.createFixtures();

    this.character = new CharacterView(
      this,
      this.room.spawn.x,
      this.room.spawn.y,
      214,
      normalizeLook(save.playerLook ?? undefined),
    );
    this.character.startIdle();
    this.character.setDepth(this.room.spawn.y);

    this.petView = new PetView(
      this,
      this.room.spawn.x + 150,
      this.room.spawn.y,
      176,
      pet.id,
      pet.accessory,
    );
    this.petView.startIdle();
    this.petView.setDepth(this.room.spawn.y + 1);
    this.petView.setInteractive(
      new Phaser.Geom.Ellipse(0, -82, 190, 204),
      Phaser.Geom.Ellipse.Contains,
    );
    this.petView.on('pointerdown', () => this.handleCare('pet'));
    this.petView.on('wish', this.handleWish, this);

    this.setupInput();
    this.setupEvents();

    if (save.tutorialDone) {
      this.createSpeechBubble(pet.name);
      this.showMovementHint();
      this.time.delayedCall(GUIDE_HINT_DURATION, () => this.maybeShowGuideHint(0));
    } else {
      this.createTutorial();
    }

    this.lastMood = moodOf(this.needs);
    this.startAmbient();
    if (!isHudDisabled()) {
      this.scene.launch(SCENE_KEYS.HUD);
    }
    this.refreshPetMood();
    this.emitHudState();
    this.cameras.main.fadeIn(260, 255, 246, 229);
  }

  override update(_time: number, delta: number): void {
    const seconds = Math.min(delta, 120) / 1000;
    const pet = save.pet;
    if (pet) {
      this.needs = pet.needs;
    }

    this.hudElapsed += delta;
    if (this.hudElapsed >= HUD_UPDATE_INTERVAL) {
      this.hudElapsed = 0;
      this.refreshPetMood();
      this.emitHudState();
    }

    this.updateMovement(seconds);
  }

  private setupEvents(): void {
    gameEvents.on(GAME_EVENTS.CARE_REQUESTED, this.handleCare, this);
    gameEvents.on(GAME_EVENTS.MENU_REQUESTED, this.returnToMenu, this);
    gameEvents.on(GAME_EVENTS.TOWN_REQUESTED, this.goToTown, this);
    gameEvents.on(GAME_EVENTS.DECOR_REQUESTED, this.togglePlacement, this);
    gameEvents.on(GAME_EVENTS.WARDROBE_REQUESTED, this.goToWardrobe, this);
    gameEvents.on(GAME_EVENTS.PETS_REQUESTED, this.openPetPanel, this);
    gameEvents.on(GAME_EVENTS.HUD_READY, this.emitHudState, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private createFixtures(): HomeFixtures {
    return new HomeFixtures(this, this.room.fixtures, (fixture) =>
      this.handleFixtureActivate(fixture),
    );
  }

  private handleFixtureActivate(fixture: HomeFixture): void {
    const view = this.fixtures?.get(fixture.id);
    if (!view) {
      return;
    }
    this.handleCare(interactionForFixture(fixture.id), view);
  }

  private handleWish(need: CareNeed): void {
    const wish = wishForNeeds(this.needs);
    if (!wish || wish.need !== need) {
      return;
    }
    this.handleCare(wish.action);
  }

  private startAmbient(): void {
    if (isReducedMotion()) {
      return;
    }
    this.ambientTimer = this.time.addEvent({
      delay: AMBIENT_IDLE_DELAY,
      loop: true,
      callback: () => this.playAmbientIdle(),
    });
  }

  private playAmbientIdle(): void {
    if (
      !save.pet ||
      this.placementMode ||
      this.petBusy ||
      this.petPanel ||
      this.transitioning ||
      moodOf(this.needs) === 'sad'
    ) {
      return;
    }

    const animations = [
      () => this.petView.playHop(),
      () => this.petView.playBow(),
      () => this.petView.playSpin(),
      () => this.petView.playNod(),
    ];
    Phaser.Utils.Array.GetRandom(animations)();
    if (Phaser.Math.Between(0, 1) === 1) {
      this.time.delayedCall(180, () => audio.play(getPet(this.petId).voice));
    }
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as
      Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.placementMode) {
        this.togglePlacement();
        return;
      }
      this.returnToMenu();
    });
    this.input.keyboard?.on('keydown-ONE', () => this.handleCare('feed'));
    this.input.keyboard?.on('keydown-TWO', () => this.handleCare('play'));
    this.input.keyboard?.on('keydown-THREE', () => this.handleCare('pet'));
    this.input.keyboard?.on('keydown-FOUR', () => this.handleCare('sleep'));
    this.input.keyboard?.on('keydown-FIVE', () => this.handleCare('treat'));
    this.input.keyboard?.on('keydown-T', () => this.goToTown());
    this.input.keyboard?.on('keydown-E', () => this.togglePlacement());
    this.input.keyboard?.on('keydown-C', () => this.goToWardrobe());
    this.input.keyboard?.on('keydown-K', () => this.openPetPanel());
    this.input.keyboard?.on('keydown-L', () => this.openPetPanel('talents'));
    this.input.on('pointermove', this.updateGhost, this);
  }

  private createFloorTrigger(): void {
    this.floorZone?.destroy();
    const top = this.room.bounds.top - 24;
    const bottom = this.room.bounds.bottom + 4;
    const zone = this.add
      .zone(GAME_WIDTH / 2, (top + bottom) / 2, GAME_WIDTH, bottom - top)
      .setDepth(1)
      .setInteractive();
    this.floorZone = zone;

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.transitioning) {
        return;
      }
      if (this.placementMode) {
        this.handlePlacementPointer(pointer);
        return;
      }
      this.cancelPetInteraction();
      this.moveTarget = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, this.room.bounds.left, this.room.bounds.right),
        Phaser.Math.Clamp(pointer.worldY, this.room.bounds.top, this.room.bounds.bottom),
      );
    });
  }

  private updateMovement(seconds: number): void {
    if (this.placementMode || this.transitioning) {
      this.character.setWalking(false);
      return;
    }

    const bounds = this.room.bounds;
    const direction = this.getKeyboardDirection();
    let moving = false;

    if (direction.lengthSq() > 0) {
      this.cancelPetInteraction();
      this.moveTarget = null;
      this.character.x = Phaser.Math.Clamp(
        this.character.x + direction.x * MOVE_SPEED * seconds,
        bounds.left,
        bounds.right,
      );
      this.character.y = Phaser.Math.Clamp(
        this.character.y + direction.y * MOVE_SPEED * seconds,
        bounds.top,
        bounds.bottom,
      );
      if (Math.abs(direction.x) > 0.1) {
        this.facingRight = direction.x > 0;
        this.character.setFacingRight(this.facingRight);
      }
      moving = true;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.character.x;
      const dy = this.moveTarget.y - this.character.y;
      const distance = Math.hypot(dx, dy);
      const step = MOVE_SPEED * seconds;

      if (distance <= step + 2) {
        this.character.setPosition(this.moveTarget.x, this.moveTarget.y);
        this.moveTarget = null;
      } else {
        this.character.x += (dx / distance) * step;
        this.character.y += (dy / distance) * step;
        if (Math.abs(dx) > 1) {
          this.facingRight = dx > 0;
          this.character.setFacingRight(this.facingRight);
        }
        moving = true;
      }
    }

    this.character.setWalking(moving);
    this.character.setDepth(Math.round(this.character.y));

    if (!this.petBusy) {
      const desiredX = Phaser.Math.Clamp(
        this.character.x + (this.facingRight ? -PET_FOLLOW_GAP : PET_FOLLOW_GAP),
        bounds.left + 40,
        bounds.right - 40,
      );
      const desiredY = Phaser.Math.Clamp(this.character.y - 8, bounds.top + 6, bounds.bottom);
      const follow = 1 - Math.exp(-PET_FOLLOW_SPEED * seconds);
      const petDx = desiredX - this.petView.x;
      this.petView.x = Phaser.Math.Linear(this.petView.x, desiredX, follow);
      this.petView.y = Phaser.Math.Linear(this.petView.y, desiredY, follow);

      if (Math.abs(petDx) > 2) {
        this.petFacingRight = petDx > 0;
        this.petView.setFacingRight(this.petFacingRight);
      }
    }
    this.petView.setDepth(Math.round(this.petView.y));
  }

  private getKeyboardDirection(): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
      direction.x -= 1;
    }
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
      direction.x += 1;
    }
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
      direction.y -= 1;
    }
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
      direction.y += 1;
    }
    return direction.normalize();
  }

  private handleCare(action: CareAction, source?: Phaser.GameObjects.Container): void {
    if (!save.pet || this.placementMode) {
      return;
    }
    if (source && this.petBusy) {
      return;
    }

    const now = this.time.now;
    if (now < this.actionReadyAt[action]) {
      return;
    }
    this.actionReadyAt[action] = now + ACTION_COOLDOWN;
    audio.unlock();

    if (source) {
      this.walkPetTo(source.x, source.y, () => this.performCare(action, source));
      return;
    }

    this.performCare(action);
  }

  private performCare(action: CareAction, source?: Phaser.GameObjects.Container): void {
    const pet = save.pet;
    if (!pet) {
      return;
    }

    let consumedTreat: string | null = null;
    if (action === 'treat') {
      consumedTreat = firstTreatId(save, getPet(this.petId).care.favoriteTreats);
      if (!consumedTreat) {
        audio.play('error');
        this.showPetMessage(text.careNoTreat);
        return;
      }
    }

    const result = applyCare(pet.needs, action, {
      petId: this.petId,
      treatId: consumedTreat,
    });
    if (action === 'treat' && result.gained <= 0) {
      this.showPetMessage(text.care.full.treat);
      return;
    }

    if (consumedTreat) {
      save.consumeItem(consumedTreat);
    }

    const beforeBond = pet.bond;
    this.needs = result.needs;
    save.updateNeeds(this.needs);
    if (result.bond > 0) {
      save.addBond(result.bond);
    }

    this.playCareAnimation(action, source);
    this.refreshPetMood();
    this.emitHudState();

    if (action === 'feed') {
      this.completeTutorial();
    }
    if (action === 'play') {
      this.markGuidePlayed();
    }

    if (result.gained <= 0) {
      this.showPetMessage(text.care.full[action]);
    } else if (result.diminished) {
      this.showPetMessage(text.care.almostFull[action]);
    } else if (consumedTreat) {
      const treat = getItem(consumedTreat);
      this.showPetMessage(
        result.favorite
          ? text.care.favoriteTreat(treat?.label ?? '')
          : text.care.treatTaste(treat?.label ?? ''),
      );
    }

    const afterBond = save.pet?.bond ?? beforeBond;
    if (bondLevelIndex(afterBond) > bondLevelIndex(beforeBond)) {
      this.showPetMessage(text.bond.levelUp(text.bond.levels[bondLevelIndex(afterBond)]));
      audio.play('happy');
      this.spawnHearts(3, this.petView.x, this.petView.y - 150, 0.8);
    }

    const feedback: CareFeedback = {
      action,
      need: CARE_EFFECTS[action].need,
    };
    gameEvents.emit(GAME_EVENTS.CARE_FEEDBACK, feedback);
  }

  private playCareAnimation(action: CareAction, source?: Phaser.GameObjects.Container): void {
    switch (action) {
      case 'feed':
      case 'treat': {
        this.petView.playNod();
        const bowl = source ?? this.fixtures?.get('bowl');
        if (bowl) {
          this.wobble(bowl);
          this.spawnFood(bowl);
        }
        audio.play('eat');
        this.time.delayedCall(220, () => audio.play(getPet(this.petId).voice));
        break;
      }
      case 'play': {
        this.petView.playJoy();
        const ball = source ?? this.fixtures?.get('ball');
        if (ball) {
          this.bounce(ball);
        }
        audio.play('play');
        this.time.delayedCall(180, () => audio.play(getPet(this.petId).voice));
        break;
      }
      case 'pet': {
        this.petView.playHop();
        const cushion = source ?? this.fixtures?.get('cushion');
        if (cushion) {
          this.wobble(cushion);
        }
        audio.play('love');
        audio.play(getPet(this.petId).voice);
        break;
      }
      case 'sleep': {
        this.petView.playSleep();
        const cushion = source ?? this.fixtures?.get('cushion');
        if (cushion) {
          this.wobble(cushion);
        }
        this.spawnSleepZ();
        audio.play('sleep');
        break;
      }
    }
  }

  private walkPetTo(x: number, y: number, onArrive: () => void): void {
    if (this.petBusy) {
      return;
    }

    const bounds = this.room.bounds;
    const side = this.petView.x <= x ? -1 : 1;
    const standX = Phaser.Math.Clamp(x + side * 86, bounds.left + 40, bounds.right - 40);
    const standY = Phaser.Math.Clamp(y + 6, bounds.top, bounds.bottom);
    this.petBusy = true;
    const token = ++this.petBusyToken;
    this.petFacingRight = x >= standX;
    this.petView.setFacingRight(this.petFacingRight);

    if (isReducedMotion()) {
      this.petView.setPosition(standX, standY);
      this.petView.setDepth(Math.round(standY));
      this.petBusy = false;
      onArrive();
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.petView.x, this.petView.y, standX, standY);
    this.petWalkTween = this.tweens.add({
      targets: this.petView,
      x: standX,
      y: standY,
      duration: Phaser.Math.Clamp(distance * 2.4, 320, 900),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.petWalkTween = undefined;
        this.petView.setDepth(Math.round(this.petView.y));
        onArrive();
        this.time.delayedCall(1500, () => {
          if (token === this.petBusyToken) {
            this.petBusy = false;
          }
        });
      },
    });
  }

  private cancelPetInteraction(): void {
    this.petBusyToken += 1;
    this.petWalkTween?.stop();
    this.petWalkTween = undefined;
    this.petBusy = false;
  }

  private handleFurnitureActivate(placed: PlacedFurniture): void {
    if (!save.pet || this.placementMode || this.petBusy) {
      return;
    }

    const interaction = interactionForItem(placed.itemId);
    if (!interaction) {
      return;
    }

    const now = this.time.now;
    if (now < this.furnitureReadyAt) {
      return;
    }
    this.furnitureReadyAt = now + FURNITURE_COOLDOWN;
    audio.unlock();
    this.walkPetTo(placed.x, placed.y, () => this.performFurnitureInteraction(interaction));
  }

  private performFurnitureInteraction(interaction: HomeInteraction): void {
    const result = applyHomeInteraction(this.needs, interaction);
    if (result.gained > 0) {
      this.needs = result.needs;
      save.updateNeeds(this.needs);
    }

    this.playFurnitureReaction(interaction.kind);

    if (interaction.kind === 'play') {
      this.markGuidePlayed();
    }

    if (result.gained > 0) {
      this.showPetMessage(text.home.interact.gain(interaction.need, result.gained));
    } else {
      const fullMessage = interaction.kind === 'sleep' ? text.care.full.sleep : text.care.full.play;
      this.showPetMessage(fullMessage);
    }

    this.refreshPetMood();
    this.emitHudState();

    const feedback: CareFeedback = {
      action:
        interaction.kind === 'sleep' ? 'sleep' : interaction.kind === 'cuddle' ? 'pet' : 'play',
      need: interaction.need,
    };
    gameEvents.emit(GAME_EVENTS.CARE_FEEDBACK, feedback);
  }

  private playFurnitureReaction(kind: HomeInteraction['kind']): void {
    switch (kind) {
      case 'play':
        this.petView.playJoy();
        audio.play('play');
        this.time.delayedCall(180, () => audio.play(getPet(this.petId).voice));
        break;
      case 'sleep':
        this.petView.playSleep();
        this.spawnSleepZ();
        audio.play('sleep');
        break;
      case 'cuddle':
        this.petView.playNod();
        audio.play('love');
        audio.play(getPet(this.petId).voice);
        break;
    }
  }

  private markGuidePlayed(): void {
    save.markHomeGuide('played');
    this.time.delayedCall(900, () => this.maybeShowGuideHint(0));
  }

  private markGuideDecorated(): void {
    save.markHomeGuide('decorated');
  }

  private maybeShowGuideHint(delay = 500): void {
    this.time.delayedCall(delay, () => {
      if (
        !this.scene.isActive() ||
        this.placementMode ||
        this.petPanel ||
        this.transitioning ||
        this.guideHint
      ) {
        return;
      }

      const task = nextGuideTask(homeGuideState(save.tutorialDone, save.homeGuide));
      if (!task || task === 'feed') {
        return;
      }
      this.showGuideHint(task);
    });
  }

  private showGuideHint(task: HomeGuideTask): void {
    if (task === 'feed') {
      return;
    }

    const info =
      task === 'play'
        ? { title: text.home.guide.play, subtitle: text.home.guide.playHint, icon: 'icon-joy' }
        : task === 'decorate'
          ? {
              title: text.home.guide.decorate,
              subtitle: text.home.guide.decorateHint,
              icon: 'icon-paint',
            }
          : { title: text.home.guide.town, subtitle: text.home.guide.townHint, icon: 'icon-shop' };

    this.movementHint?.destroy(true);
    this.movementHint = undefined;
    this.guideHint?.destroy(true);

    const width = 610;
    const height = 86;
    const hint = this.add.container(GAME_WIDTH / 2, 152).setDepth(955);
    this.guideHint = hint;

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.96);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 26);
    background.lineStyle(4, COLORS.teal, 0.8);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 26);

    const icon = this.add.image(-width / 2 + 52, -13, info.icon).setDisplaySize(42, 42);
    const title = this.add
      .text(-width / 2 + 90, -22, info.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '25px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const subtitle = this.add
      .text(-width / 2 + 90, 14, info.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    hint.add([background, icon, title, subtitle]);
    gameEvents.emit(GAME_EVENTS.GUIDE_TARGET, {
      target: guideTarget(task),
    } satisfies GuideTargetState);

    if (isReducedMotion()) {
      this.time.delayedCall(GUIDE_HINT_DURATION, () => {
        hint.destroy(true);
        if (this.guideHint === hint) {
          this.guideHint = undefined;
        }
      });
      return;
    }

    hint.setAlpha(0).setScale(0.96);
    this.tweens.add({
      targets: hint,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: hint,
      alpha: 0,
      duration: 400,
      delay: GUIDE_HINT_DURATION,
      onComplete: () => {
        hint.destroy(true);
        if (this.guideHint === hint) {
          this.guideHint = undefined;
        }
      },
    });
  }

  private destroyGuideHint(): void {
    this.guideHint?.destroy(true);
    this.guideHint = undefined;
  }

  private refreshPetMood(): void {
    const mood = moodOf(this.needs);
    if (mood !== this.lastMood) {
      this.lastMood = mood;
      audio.play(mood === 'happy' ? 'happy' : mood === 'sad' ? 'sad' : 'pop');
    }
    this.petView.setMood(mood);
    this.petView.showNeedBubble(isNeedLow(this.needs) ? lowestNeed(this.needs) : null);

    if (mood === 'happy' && !isReducedMotion()) {
      if (!this.moodHeartsTimer) {
        this.moodHeartsTimer = this.time.addEvent({
          delay: 7000,
          loop: true,
          callback: () => this.spawnHearts(1, this.petView.x, this.petView.y - 140, 0.65),
        });
      }
    } else {
      this.moodHeartsTimer?.remove();
      this.moodHeartsTimer = undefined;
    }
  }

  private emitHudState(): void {
    const pet = save.pet;
    if (!pet) {
      return;
    }
    const state: HudState = {
      petId: this.petId,
      petName: this.petName,
      needs: { ...this.needs },
      hearts: save.hearts,
      mood: moodOf(this.needs),
      bond: pet.bond,
      favoriteAction: getPet(this.petId).care.favoriteAction,
      treatCount: treatCount(save),
      petCount: save.pets.length,
    };
    gameEvents.emit(GAME_EVENTS.HUD_STATE, state);
  }

  private persistNeeds(): void {
    save.persistNeeds();
  }

  private returnToMenu(): void {
    this.persistNeeds();
    this.scene.stop(SCENE_KEYS.HUD);
    this.scene.start(SCENE_KEYS.MENU);
  }

  private goToTown(): void {
    if (this.placementMode) {
      this.exitPlacement();
    }
    save.markHomeGuide('town');
    this.cancelPetInteraction();
    this.persistNeeds();
    this.scene.stop(SCENE_KEYS.HUD);
    this.scene.start(SCENE_KEYS.TOWN);
  }

  private goToWardrobe(): void {
    if (this.placementMode) {
      this.exitPlacement();
    }
    this.cancelPetInteraction();
    this.persistNeeds();
    this.scene.stop(SCENE_KEYS.HUD);
    this.scene.start(SCENE_KEYS.CHARACTER, { mode: 'edit' });
  }

  private openPetPanel(mode: PetPanelMode = 'pets'): void {
    if (this.petPanel) {
      return;
    }
    if (this.placementMode) {
      this.exitPlacement();
    }
    this.cancelPetInteraction();
    this.destroyGuideHint();
    this.persistNeeds();
    this.scene.stop(SCENE_KEYS.HUD);
    const unlockedTalentIds = new Set<TalentId>(
      TALENTS.filter((talent) => save.schoolProgress(talent.subject).firstCompleted).map(
        (talent) => talent.id,
      ),
    );
    this.petPanel = new PetPanel(
      this,
      save.pets,
      save.activePetId,
      unlockedTalentIds,
      (uid) => this.switchPet(uid),
      (talent) => this.handleTalent(talent),
      () => this.closePetPanel(),
      () => this.goToPetShop(),
      mode,
    );
  }

  private handleTalent(talent: TalentDefinition): void {
    this.closePetPanel();
    this.time.delayedCall(0, () => this.performTalent(talent));
  }

  private performTalent(talent: TalentDefinition): void {
    if (!save.schoolProgress(talent.subject).firstCompleted) {
      return;
    }
    const now = this.time.now;
    if (now < this.talentReadyAt) {
      return;
    }
    this.talentReadyAt = now + 1200;
    audio.unlock();

    const pet = save.pet;
    if (!pet) {
      return;
    }

    const before = pet.needs.joy;
    const needs = { ...pet.needs, joy: Math.min(100, pet.needs.joy + 5) };
    this.needs = needs;
    if (needs.joy !== before) {
      save.updateNeeds(needs);
    }
    this.refreshPetMood();
    this.emitHudState();

    if (talent.sound) {
      audio.play(talent.sound);
    }

    switch (talent.animation) {
      case 'count':
        this.petView.playNod();
        this.spawnTalentText('1', 0);
        this.spawnTalentText('2', 260);
        this.spawnTalentText('3', 520);
        break;
      case 'read':
        this.petView.playNod();
        this.spawnTalentText('A B C', 80);
        break;
      case 'hello':
        this.petView.playJoy();
        speak(text.talents.hello.message, 'en-US');
        break;
      case 'sniff':
        this.petView.playNod();
        this.spawnTalentIcon('icon-nature');
        break;
      case 'bow':
        this.petView.playBow();
        break;
      case 'fold':
        this.petView.playSleep();
        break;
      case 'sing':
        this.petView.playJoy();
        if (talent.notes) {
          audio.playNotes(talent.notes);
        }
        this.spawnTalentText('♪', 0);
        this.spawnTalentText('♪', 180);
        this.spawnTalentText('♪', 360);
        break;
      case 'jump':
        this.petView.playHop();
        this.time.delayedCall(260, () => this.petView.playJoy());
        break;
    }

    this.showPetMessage(text.talents[talent.id].message);
  }

  private spawnTalentText(label: string, delay: number): void {
    this.time.delayedCall(delay, () => {
      const note = this.add
        .text(this.petView.x + Phaser.Math.Between(-30, 30), this.petView.y - 170, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: COLORS.textAccent,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(970);

      if (isReducedMotion()) {
        this.time.delayedCall(900, () => note.destroy());
        return;
      }

      this.tweens.add({
        targets: note,
        y: note.y - 60,
        alpha: 0,
        duration: 900,
        ease: 'Quad.easeOut',
        onComplete: () => note.destroy(),
      });
    });
  }

  private spawnTalentIcon(iconKey: string): void {
    const icon = this.add
      .image(this.petView.x, this.petView.y - 150, iconKey)
      .setDisplaySize(46, 46)
      .setDepth(970);

    if (isReducedMotion()) {
      this.time.delayedCall(1000, () => icon.destroy());
      return;
    }

    this.tweens.add({
      targets: icon,
      y: icon.y - 46,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => icon.destroy(),
    });
  }

  private closePetPanel(relaunchHud = true): void {
    this.petPanel?.destroy(true);
    this.petPanel = undefined;
    if (relaunchHud && !this.scene.isActive(SCENE_KEYS.HUD)) {
      this.scene.launch(SCENE_KEYS.HUD);
    }
    this.maybeShowGuideHint(500);
  }

  private switchPet(uid: string): void {
    if (uid === save.activePetId) {
      return;
    }
    this.cancelPetInteraction();
    this.persistNeeds();
    if (!save.setActivePet(uid)) {
      return;
    }
    const pet = save.pet;
    if (!pet) {
      return;
    }

    this.petId = pet.id;
    this.petName = pet.name;
    this.needs = { ...pet.needs };
    this.lastMood = moodOf(this.needs);
    this.petView.setPet(pet.id);
    this.petView.setAccessory(pet.accessory);
    this.petView.setMood(this.lastMood);
    this.petView.startIdle();
    this.petFacingRight = true;
    this.petView.setFacingRight(true);
    this.refreshPetMood();
    this.closePetPanel();
    this.emitHudState();
    this.speechBubble?.destroy(true);
    this.speechBubble = undefined;
    this.createSpeechBubble(pet.name);
    audio.play('pop');
  }

  private goToPetShop(): void {
    this.closePetPanel(false);
    this.persistNeeds();
    this.scene.stop(SCENE_KEYS.HUD);
    this.scene.start(SCENE_KEYS.SHOP);
  }

  private handleShutdown(): void {
    this.persistNeeds();
    this.moodHeartsTimer?.remove();
    this.ambientTimer?.remove();
    this.ambientTimer = undefined;
    this.cancelPetInteraction();
    this.destroyGuideHint();
    this.fixtures?.destroy();
    this.fixtures = undefined;
    this.furnitureViews.clear();
    this.interactiveFurniture.clear();
    this.roomPositions.clear();
    this.seenFurnitureHints.clear();
    this.doorViews.length = 0;
    this.petView.off('wish', this.handleWish, this);
    gameEvents.off(GAME_EVENTS.CARE_REQUESTED, this.handleCare, this);
    gameEvents.off(GAME_EVENTS.MENU_REQUESTED, this.returnToMenu, this);
    gameEvents.off(GAME_EVENTS.TOWN_REQUESTED, this.goToTown, this);
    gameEvents.off(GAME_EVENTS.DECOR_REQUESTED, this.togglePlacement, this);
    gameEvents.off(GAME_EVENTS.WARDROBE_REQUESTED, this.goToWardrobe, this);
    gameEvents.off(GAME_EVENTS.PETS_REQUESTED, this.openPetPanel, this);
    gameEvents.off(GAME_EVENTS.HUD_READY, this.emitHudState, this);
    this.petPanel?.destroy(true);
    this.petPanel = undefined;
    this.input.off('pointermove', this.updateGhost, this);
    if (this.scene.isActive(SCENE_KEYS.HUD)) {
      this.scene.stop(SCENE_KEYS.HUD);
    }
  }

  private createDoors(): void {
    for (const door of this.room.doors) {
      const container = this.add.container(door.x, door.y).setDepth(80);
      const background = this.add.graphics();
      background.fillStyle(COLORS.panel, 0.95);
      background.fillRoundedRect(-98, -34, 196, 68, 22);
      background.lineStyle(4, COLORS.teal, 0.9);
      background.strokeRoundedRect(-98, -34, 196, 68, 22);

      const icon = this.add.graphics();
      icon.fillStyle(COLORS.teal, 1);
      icon.fillRoundedRect(-88, -18, 30, 40, 7);
      icon.fillStyle(COLORS.accent, 1);
      icon.fillCircle(-64, 2, 4);
      icon.lineStyle(3, COLORS.ink, 0.45);
      icon.strokeRoundedRect(-88, -18, 30, 40, 7);

      const label = this.add
        .text(14, 0, door.label, {
          fontFamily: FONT_FAMILY,
          fontSize: '22px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      container.add([background, icon, label]);
      container.setSize(208, 80);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-104, -40, 208, 80),
        Phaser.Geom.Rectangle.Contains,
      );
      container.on('pointerup', () => this.switchRoom(door.target));
      this.doorViews.push(container);
    }
  }

  private clearDoors(): void {
    for (const view of this.doorViews) {
      view.destroy(true);
    }
    this.doorViews.length = 0;
  }

  private switchRoom(target: RoomId): void {
    if (target === this.room.id || this.transitioning) {
      return;
    }

    if (this.placementMode) {
      this.exitPlacement();
    }

    this.cancelPetInteraction();
    this.destroyGuideHint();
    this.roomPositions.set(this.room.id, { x: this.character.x, y: this.character.y });
    this.transitioning = true;
    this.input.enabled = false;

    const apply = (): void => {
      this.applyRoom(target);
      this.input.enabled = true;
      this.transitioning = false;
      if (!isReducedMotion()) {
        this.cameras.main.fadeIn(200, 255, 246, 229);
      }
      this.maybeShowGuideHint(700);
    };

    if (isReducedMotion()) {
      apply();
      return;
    }

    this.cameras.main.fadeOut(140, 255, 246, 229);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, apply);
  }

  private applyRoom(target: RoomId): void {
    this.room = getRoom(target);
    this.roomBackground?.destroy();
    this.roomBackground = this.add.image(GAME_WIDTH / 2, 360, this.room.assetKey).setDepth(-10);
    this.clearDoors();
    this.createDoors();

    for (const view of this.furnitureViews.values()) {
      view.destroy(true);
    }
    this.furnitureViews.clear();
    this.interactiveFurniture.clear();
    this.createFurnitureViews();

    this.fixtures?.destroy();
    this.fixtures = this.createFixtures();
    this.createFloorTrigger();

    this.moveTarget = null;
    const position = this.roomPositions.get(target) ?? this.room.spawn;
    this.character.setPosition(position.x, position.y);
    this.character.setDepth(position.y);
    const petX = Phaser.Math.Clamp(
      position.x + 150,
      this.room.bounds.left + 40,
      this.room.bounds.right - 40,
    );
    this.petView.setPosition(petX, position.y);
    this.petView.setDepth(position.y + 1);
    this.petFacingRight = true;
    this.petView.setFacingRight(true);
    this.tutorialRing?.setVisible(target === 'living');
    this.tutorialArrow?.setVisible(target === 'living');
  }

  private createFurnitureViews(): void {
    for (const placed of save.furniture) {
      if (placed.room === this.room.id) {
        this.createFurnitureView(placed);
      }
    }
  }

  private createFurnitureView(placed: PlacedFurniture): Phaser.GameObjects.Container | null {
    const item = getItem(placed.itemId);
    if (!item) {
      return null;
    }

    const footprint = footprintOf(item);
    const interactive = interactionForItem(placed.itemId) !== null;
    if (interactive) {
      this.interactiveFurniture.add(placed.uid);
    }
    const view = this.add.container(placed.x, placed.y).setDepth(Math.round(placed.y));
    const shadow = this.add.ellipse(
      0,
      footprint.height / 2 - 4,
      footprint.width * 0.82,
      footprint.height * 0.13,
      COLORS.ink,
      0.14,
    );
    const image = this.add
      .image(0, 0, item.assetKey)
      .setDisplaySize(footprint.width, footprint.height);
    view.add([shadow, image]);
    view.setSize(footprint.width, footprint.height);

    let originX = placed.x;
    let originY = placed.y;

    if (this.placementMode || interactive) {
      view.setInteractive(
        new Phaser.Geom.Rectangle(
          -footprint.width / 2,
          -footprint.height / 2,
          footprint.width,
          footprint.height,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
    }
    view.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (this.placementMode) {
          this.selectFurniture(placed.uid);
          return;
        }
        if (!interactive) {
          return;
        }
        event.stopPropagation();
        this.handleFurnitureActivate(placed);
      },
    );
    view.on('dragstart', () => {
      if (!this.placementMode) {
        return;
      }
      this.selectFurniture(placed.uid);
      originX = view.x;
      originY = view.y;
      view.setDepth(1000);
      view.setAlpha(0.9);
    });
    view.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (!this.placementMode) {
        return;
      }
      view.setPosition(dragX, dragY);
    });
    view.on('dragend', () => {
      if (!this.placementMode) {
        return;
      }
      view.setAlpha(1);
      const moved = getItem(placed.itemId);
      if (!moved) {
        view.setPosition(originX, originY);
        return;
      }
      const snapped = clampCenter(moved, view.x, view.y, this.room.placementArea);
      const valid = canPlace(
        moved,
        snapped.x,
        snapped.y,
        this.room.placementArea,
        this.room.id,
        save.furniture,
        placed.uid,
      );

      if (valid) {
        view.setPosition(snapped.x, snapped.y);
        view.setDepth(Math.round(snapped.y));
        originX = snapped.x;
        originY = snapped.y;
        save.moveFurniture(placed.uid, snapped.x, snapped.y);
        this.markGuideDecorated();
      } else {
        view.setPosition(originX, originY);
        view.setDepth(Math.round(originY));
        this.showPlacementToast(text.placement.noSpace);
      }
      this.refreshInventoryPanel();
    });

    if (this.placementMode) {
      this.input.setDraggable(view, true);
    }

    this.furnitureViews.set(placed.uid, view);
    return view;
  }

  private togglePlacement(): void {
    if (this.placementMode) {
      this.exitPlacement();
    } else {
      this.enterPlacement();
    }
  }

  private enterPlacement(): void {
    if (this.placementMode) {
      return;
    }
    this.placementMode = true;
    this.moveTarget = null;
    this.character.setWalking(false);
    this.cancelPetInteraction();
    this.selectedUid = null;
    this.selectedItemId = null;
    this.movementHint?.destroy(true);
    this.movementHint = undefined;
    this.destroyGuideHint();
    this.speechBubble?.destroy(true);
    this.speechBubble = undefined;

    for (const view of this.furnitureViews.values()) {
      view.setInteractive(
        new Phaser.Geom.Rectangle(-view.width / 2, -view.height / 2, view.width, view.height),
        Phaser.Geom.Rectangle.Contains,
      );
      this.input.setDraggable(view, true);
    }

    this.createPlacementHint();
    this.refreshInventoryPanel();
    gameEvents.emit(GAME_EVENTS.PLACEMENT_STATE, { active: true } satisfies PlacementState);
  }

  private exitPlacement(): void {
    if (!this.placementMode) {
      return;
    }
    this.placementMode = false;
    this.selectedUid = null;
    this.selectedItemId = null;
    this.hideGhost();
    this.inventoryPanel?.destroy(true);
    this.inventoryPanel = undefined;
    this.placementHint?.destroy();
    this.placementHint = undefined;

    for (const [uid, view] of this.furnitureViews) {
      this.input.setDraggable(view, false);
      if (this.interactiveFurniture.has(uid)) {
        view.setInteractive(
          new Phaser.Geom.Rectangle(-view.width / 2, -view.height / 2, view.width, view.height),
          Phaser.Geom.Rectangle.Contains,
        );
      } else {
        view.disableInteractive();
      }
    }

    gameEvents.emit(GAME_EVENTS.PLACEMENT_STATE, { active: false } satisfies PlacementState);
    this.maybeShowGuideHint(700);
  }

  private createPlacementHint(): void {
    this.placementHint?.destroy();
    this.placementHint = this.add
      .text(560, 150, text.placement.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: COLORS.text,
        backgroundColor: '#fff8ee',
        padding: { x: 20, y: 10 },
        align: 'center',
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5)
      .setDepth(940);
  }

  private refreshInventoryPanel(): void {
    this.inventoryPanel?.destroy(true);
    this.inventoryPanel = undefined;

    if (!this.placementMode) {
      return;
    }

    this.inventoryPanel = new InventoryPanel(
      this,
      1090,
      365,
      this.inventoryEntries(),
      this.selectedItemId,
      this.selectedUid,
      (item) => this.selectInventoryItem(item),
      () => this.removeSelectedFurniture(),
    );
  }

  private inventoryEntries(): InventoryEntry[] {
    const entries: InventoryEntry[] = [];
    for (const [itemId, count] of Object.entries(save.inventory)) {
      if (count <= 0) {
        continue;
      }
      const item = getItem(itemId);
      if (item?.placeable) {
        entries.push({ item, count });
      }
    }
    entries.sort(
      (a, b) =>
        a.item.category.localeCompare(b.item.category) ||
        a.item.label.localeCompare(b.item.label, 'da'),
    );
    return entries;
  }

  private selectInventoryItem(item: ItemDefinition): void {
    this.selectedItemId = item.id;
    this.selectedUid = null;
    this.showGhost(item);
    this.refreshInventoryPanel();
  }

  private selectFurniture(uid: string): void {
    if (!this.placementMode) {
      return;
    }
    this.selectedUid = uid;
    this.selectedItemId = null;
    this.hideGhost();
    this.refreshInventoryPanel();
  }

  private removeSelectedFurniture(): void {
    if (!this.selectedUid) {
      return;
    }
    const placed = save.furniture.find((entry) => entry.uid === this.selectedUid);
    if (!placed) {
      return;
    }
    const view = this.furnitureViews.get(placed.uid);
    view?.destroy(true);
    this.furnitureViews.delete(placed.uid);
    this.interactiveFurniture.delete(placed.uid);
    save.removeFurniture(placed.uid);
    save.addItem(placed.itemId);
    this.selectedUid = null;
    this.markGuideDecorated();
    audio.play('pop');
    this.refreshInventoryPanel();
  }

  private showGhost(item: ItemDefinition): void {
    this.hideGhost();
    if (!this.textures.exists(item.assetKey)) {
      return;
    }
    this.ghost = this.add
      .image(GAME_WIDTH / 2, 500, item.assetKey)
      .setDisplaySize(item.width, item.height)
      .setAlpha(0.55)
      .setDepth(990);
  }

  private hideGhost(): void {
    this.ghost?.destroy();
    this.ghost = undefined;
  }

  private updateGhost(pointer: Phaser.Input.Pointer): void {
    if (!this.placementMode || !this.selectedItemId || !this.ghost) {
      return;
    }
    const item = getItem(this.selectedItemId);
    if (!item) {
      return;
    }

    const snapped = clampCenter(item, pointer.worldX, pointer.worldY, this.room.placementArea);
    this.ghost.setPosition(snapped.x, snapped.y);
    const valid = canPlace(
      item,
      snapped.x,
      snapped.y,
      this.room.placementArea,
      this.room.id,
      save.furniture,
    );
    setTintableTexture(this.ghost, item.assetKey, valid ? 0xa7e6b8 : 0xffb3b3);
  }

  private handlePlacementPointer(pointer: Phaser.Input.Pointer): void {
    if (this.selectedItemId) {
      this.placeSelectedItem(pointer);
      return;
    }
    if (this.selectedUid) {
      this.selectedUid = null;
      this.refreshInventoryPanel();
    }
  }

  private placeSelectedItem(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedItemId) {
      return;
    }
    const item = getItem(this.selectedItemId);
    if (!item) {
      return;
    }

    const snapped = clampCenter(item, pointer.worldX, pointer.worldY, this.room.placementArea);
    const valid = canPlace(
      item,
      snapped.x,
      snapped.y,
      this.room.placementArea,
      this.room.id,
      save.furniture,
    );

    if (!valid) {
      this.showPlacementToast(text.placement.noSpace);
      return;
    }

    if (!save.consumeItem(item.id)) {
      return;
    }

    const placed = {
      uid: createFurnitureUid(),
      itemId: item.id,
      room: this.room.id,
      x: snapped.x,
      y: snapped.y,
    };
    save.addFurniture(placed);
    this.createFurnitureView(placed);
    this.selectedItemId = null;
    this.hideGhost();
    this.markGuideDecorated();
    this.maybeShowFurnitureTip(item);
    audio.play('pop');
    this.refreshInventoryPanel();
  }

  private maybeShowFurnitureTip(item: ItemDefinition): void {
    if (!interactionForItem(item.id) || this.seenFurnitureHints.has(item.id)) {
      return;
    }
    this.seenFurnitureHints.add(item.id);
    const message =
      item.category === 'toy' ? text.home.interact.toyHint : text.home.interact.useHint;
    this.time.delayedCall(350, () => this.showPlacementToast(message));
  }

  private showPlacementToast(message: string): void {
    const toast = this.add
      .text(560, 214, message, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
        backgroundColor: '#fff8ee',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(995);

    if (isReducedMotion()) {
      this.time.delayedCall(1300, () => toast.destroy());
      return;
    }

    this.tweens.add({
      targets: toast,
      y: 190,
      alpha: 0,
      duration: 1100,
      delay: 250,
      ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  private createTutorial(): void {
    const banner = this.add.container(GAME_WIDTH / 2, 164).setDepth(960);
    const width = 520;
    const height = 86;

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 26);
    background.lineStyle(5, COLORS.accent, 0.95);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 26);

    const icon = this.add.image(-width / 2 + 52, -12, 'icon-tap').setDisplaySize(44, 44);
    const title = this.add
      .text(-width / 2 + 92, -22, text.tutorial.feed, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const hint = this.add
      .text(-width / 2 + 92, 12, text.tutorial.feedHint, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    banner.add([background, icon, title, hint]);
    if (!isReducedMotion()) {
      banner.setAlpha(0).setScale(0.94);
      this.tweens.add({
        targets: banner,
        alpha: 1,
        scale: 1,
        duration: 320,
        delay: 400,
        ease: 'Back.easeOut',
      });
    }

    const bowl = this.fixtures?.get('bowl');
    if (bowl) {
      this.tutorialRing = this.add
        .circle(bowl.x, bowl.y - 24, 70)
        .setStrokeStyle(6, COLORS.primary, 0.95)
        .setDepth(950);
      if (!isReducedMotion()) {
        this.tweens.add({
          targets: this.tutorialRing,
          scale: 1.18,
          alpha: 0.35,
          duration: 760,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      const arrow = this.add.container(bowl.x, bowl.y - 122).setDepth(951);
      const arrowGraphics = this.add.graphics();
      arrowGraphics.fillStyle(COLORS.primary, 0.95);
      arrowGraphics.fillTriangle(-22, -18, 22, -18, 0, 20);
      arrow.add(arrowGraphics);
      if (!isReducedMotion()) {
        this.tweens.add({
          targets: arrow,
          y: bowl.y - 132,
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      this.tutorialArrow = arrow;
    }

    this.tutorialBanner = banner;
  }

  private completeTutorial(): void {
    if (!this.tutorialBanner) {
      return;
    }

    const targets: Phaser.GameObjects.GameObject[] = [];
    if (this.tutorialBanner) {
      targets.push(this.tutorialBanner);
    }
    if (this.tutorialRing) {
      targets.push(this.tutorialRing);
    }
    if (this.tutorialArrow) {
      targets.push(this.tutorialArrow);
    }

    if (isReducedMotion()) {
      targets.forEach((target) => target.destroy());
    } else {
      this.tweens.add({
        targets,
        alpha: 0,
        duration: 240,
        onComplete: () => targets.forEach((target) => target.destroy()),
      });
    }

    this.tutorialBanner = undefined;
    this.tutorialRing = undefined;
    this.tutorialArrow = undefined;
    save.setTutorialDone(true);
    this.time.delayedCall(700, () => this.showMovementHint());
    this.time.delayedCall(GUIDE_HINT_DURATION, () => this.maybeShowGuideHint(0));
  }

  private showMovementHint(): void {
    this.movementHint?.destroy();
    const hint = this.add.container(GAME_WIDTH / 2, 152).setDepth(955);
    this.movementHint = hint;
    const width = 390;
    const height = 62;

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.94);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    background.lineStyle(3, COLORS.teal, 0.7);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 20);

    const icon = this.add.image(-width / 2 + 44, 0, 'icon-tap').setDisplaySize(34, 34);
    const label = this.add
      .text(-width / 2 + 74, 0, text.home.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '23px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    hint.add([background, icon, label]);
    if (isReducedMotion()) {
      this.time.delayedCall(4400, () => {
        hint.destroy(true);
        if (this.movementHint === hint) {
          this.movementHint = undefined;
        }
      });
      return;
    }
    hint.setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: 1,
      duration: 260,
      delay: 200,
      onComplete: () => {
        this.tweens.add({
          targets: hint,
          alpha: 0,
          duration: 450,
          delay: 4200,
          onComplete: () => {
            hint.destroy(true);
            if (this.movementHint === hint) {
              this.movementHint = undefined;
            }
          },
        });
      },
    });
  }

  private createSpeechBubble(petName: string): void {
    this.speechBubble?.destroy(true);
    const bubble = this.add.container(806, 372).setDepth(800);
    this.speechBubble = bubble;
    const width = 400;
    const height = 118;

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 28);
    background.lineStyle(4, COLORS.accent, 0.95);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 28);
    background.fillStyle(COLORS.panel, 0.98);
    background.fillTriangle(-54, height / 2 - 2, -8, height / 2 - 2, -44, height / 2 + 30);

    const message = this.add
      .text(0, 0, text.home.greeting(petName), {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: width - 56 },
      })
      .setOrigin(0.5);

    bubble.add([background, message]);
    if (isReducedMotion()) {
      this.time.delayedCall(3600, () => {
        bubble.destroy(true);
        if (this.speechBubble === bubble) {
          this.speechBubble = undefined;
        }
      });
      return;
    }
    bubble.setAlpha(0).setScale(0.9);
    this.tweens.add({
      targets: bubble,
      alpha: 1,
      scale: 1,
      duration: 320,
      delay: 350,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: bubble,
      alpha: 0,
      duration: 300,
      delay: 3600,
      onComplete: () => {
        bubble.destroy(true);
        if (this.speechBubble === bubble) {
          this.speechBubble = undefined;
        }
      },
    });
  }

  private spawnHearts(count: number, x: number, y: number, alpha = 1): void {
    if (isReducedMotion()) {
      return;
    }
    for (let index = 0; index < count; index += 1) {
      const size = Phaser.Math.Between(24, 38);
      const heart = this.add
        .image(x + Phaser.Math.Between(-34, 34), y + Phaser.Math.Between(-10, 18), 'icon-heart')
        .setDisplaySize(size, size)
        .setAlpha(alpha)
        .setDepth(970);

      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(70, 130),
        x: heart.x + Phaser.Math.Between(-30, 30),
        angle: Phaser.Math.Between(-25, 25),
        alpha: 0,
        scale: heart.scale * 0.7,
        duration: Phaser.Math.Between(900, 1500),
        delay: index * 90,
        ease: 'Quad.easeOut',
        onComplete: () => heart.destroy(),
      });
    }
  }

  private spawnFood(bowl: Phaser.GameObjects.Container): void {
    if (isReducedMotion()) {
      return;
    }

    for (let index = 0; index < 5; index += 1) {
      const bit = this.add
        .circle(
          bowl.x + Phaser.Math.Between(-22, 22),
          bowl.y - 52,
          Phaser.Math.Between(4, 7),
          0xe7b782,
          1,
        )
        .setDepth(965);

      this.tweens.add({
        targets: bit,
        x: this.petView.x + Phaser.Math.Between(-24, 24),
        y: this.petView.y - Phaser.Math.Between(40, 90),
        alpha: 0.2,
        duration: 380,
        delay: index * 55,
        ease: 'Quad.easeOut',
        onComplete: () => bit.destroy(),
      });
    }
  }

  private spawnSleepZ(): void {
    if (isReducedMotion()) {
      return;
    }
    const z = this.add
      .text(this.petView.x + 44, this.petView.y - 150, 'Z', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(970);

    this.tweens.add({
      targets: z,
      y: z.y - 54,
      x: z.x + 22,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => z.destroy(),
    });
  }

  private showPetMessage(message: string): void {
    const bubble = this.add
      .text(this.petView.x, this.petView.y - 170, message, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: COLORS.text,
        backgroundColor: '#fff8ee',
        padding: { x: 16, y: 10 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(970);

    if (isReducedMotion()) {
      this.time.delayedCall(1500, () => bubble.destroy());
      return;
    }
    this.tweens.add({
      targets: bubble,
      y: bubble.y - 34,
      alpha: 0,
      duration: 1300,
      delay: 350,
      ease: 'Quad.easeOut',
      onComplete: () => bubble.destroy(),
    });
  }

  private wobble(target?: Phaser.GameObjects.Container): void {
    if (!target || isReducedMotion()) {
      return;
    }
    this.tweens.add({
      targets: target,
      angle: { from: -4, to: 4 },
      duration: 90,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        target.angle = 0;
      },
    });
  }

  private bounce(target?: Phaser.GameObjects.Container): void {
    if (!target || isReducedMotion()) {
      return;
    }
    this.tweens.add({
      targets: target,
      y: target.y - 44,
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });
  }
}
