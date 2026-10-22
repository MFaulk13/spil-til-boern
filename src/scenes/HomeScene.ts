import Phaser from 'phaser';
import { firstTreatId, getItem, treatCount, type ItemDefinition } from '@/game/catalog/items';
import { getPet } from '@/game/catalog/pets';
import { getRoom, ROOMS, type RoomDefinition } from '@/game/catalog/rooms';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import type { Needs, PetId, RoomId } from '@/game/types';
import { normalizeLook } from '@/systems/appearance';
import { isReducedMotion } from '@/systems/motion';
import { audio } from '@/systems/audio';
import { rewardCare } from '@/systems/economy';
import {
  GAME_EVENTS,
  gameEvents,
  type CareFeedback,
  type HudState,
  type PlacementState,
} from '@/systems/events';
import {
  CARE_EFFECTS,
  applyCare,
  isNeedLow,
  lowestNeed,
  moodOf,
  tickNeeds,
  type CareAction,
  type Mood,
} from '@/systems/pet';
import { canPlace, clampCenter, createFurnitureUid, footprintOf } from '@/systems/placement';
import { save } from '@/systems/save';
import { CharacterView } from '@/ui/CharacterView';
import { InventoryPanel, type InventoryEntry } from '@/ui/InventoryPanel';
import { PetView } from '@/ui/PetView';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const MOVE_SPEED = 330;
const PET_FOLLOW_GAP = 118;
const PET_FOLLOW_SPEED = 6;
const AUTOSAVE_INTERVAL = 10_000;
const HUD_UPDATE_INTERVAL = 200;
const ACTION_COOLDOWN = 650;

const BOWL = { x: 236, y: 586 };
const BALL = { x: 1032, y: 584 };
const CUSHION = { x: 916, y: 574 };

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
  private autosaveElapsed = 0;
  private hudElapsed = 0;
  private actionReadyAt: Record<CareAction, number> = {
    feed: 0,
    play: 0,
    pet: 0,
    sleep: 0,
    treat: 0,
  };
  private bowl?: Phaser.GameObjects.Container;
  private ball?: Phaser.GameObjects.Container;
  private cushion?: Phaser.GameObjects.Container;
  private tutorialBanner?: Phaser.GameObjects.Container;
  private tutorialRing?: Phaser.GameObjects.Arc;
  private tutorialArrow?: Phaser.GameObjects.Container;
  private moodHeartsTimer?: Phaser.Time.TimerEvent;
  private room: RoomDefinition = ROOMS.living;
  private roomBackground?: Phaser.GameObjects.Image;
  private readonly doorViews: Phaser.GameObjects.Container[] = [];
  private readonly furnitureViews = new Map<string, Phaser.GameObjects.Container>();
  private placementMode = false;
  private selectedUid: string | null = null;
  private selectedItemId: string | null = null;
  private ghost?: Phaser.GameObjects.Image;
  private inventoryPanel?: InventoryPanel;
  private placementHint?: Phaser.GameObjects.Text;
  private floorZone?: Phaser.GameObjects.Zone;
  private movementHint?: Phaser.GameObjects.Container;
  private speechBubble?: Phaser.GameObjects.Container;
  private lastMood: Mood = 'okay';

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
    this.autosaveElapsed = 0;
    this.hudElapsed = 0;
    this.actionReadyAt = { feed: 0, play: 0, pet: 0, sleep: 0, treat: 0 };
    this.placementMode = false;
    this.selectedUid = null;
    this.selectedItemId = null;
    this.room = getRoom('living');
    this.furnitureViews.clear();

    this.roomBackground = this.add.image(GAME_WIDTH / 2, 360, this.room.assetKey).setDepth(0);
    this.createFloorTrigger();
    this.createDoors();
    this.createFurnitureViews();

    this.bowl = this.createBowl();
    this.ball = this.createBall();
    this.cushion = this.createCushion();

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
      new Phaser.Geom.Ellipse(0, -76, 150, 176),
      Phaser.Geom.Ellipse.Contains,
    );
    this.petView.on('pointerdown', () => this.handleCare('pet'));

    this.setupInput();
    this.setupEvents();

    if (save.tutorialDone) {
      this.createSpeechBubble(pet.name);
      this.showMovementHint();
    } else {
      this.createTutorial();
    }

    this.lastMood = moodOf(this.needs);
    this.updateCareObjects();
    this.scene.launch(SCENE_KEYS.HUD);
    this.refreshPetMood();
    this.emitHudState();
    this.cameras.main.fadeIn(260, 255, 246, 229);
  }

  override update(_time: number, delta: number): void {
    const seconds = Math.min(delta, 120) / 1000;

    this.needs = tickNeeds(this.needs, seconds);

    this.autosaveElapsed += delta;
    if (this.autosaveElapsed >= AUTOSAVE_INTERVAL) {
      this.autosaveElapsed = 0;
      this.persistNeeds();
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
    gameEvents.on(GAME_EVENTS.HUD_READY, this.emitHudState, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
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
      if (this.placementMode) {
        this.handlePlacementPointer(pointer);
        return;
      }
      this.moveTarget = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, this.room.bounds.left, this.room.bounds.right),
        Phaser.Math.Clamp(pointer.worldY, this.room.bounds.top, this.room.bounds.bottom),
      );
    });
  }

  private updateMovement(seconds: number): void {
    if (this.placementMode) {
      this.character.setWalking(false);
      return;
    }

    const bounds = this.room.bounds;
    const direction = this.getKeyboardDirection();
    let moving = false;

    if (direction.lengthSq() > 0) {
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

  private handleCare(action: CareAction): void {
    if (!save.pet || this.placementMode) {
      return;
    }

    const now = this.time.now;
    if (now < this.actionReadyAt[action]) {
      return;
    }
    this.actionReadyAt[action] = now + ACTION_COOLDOWN;
    audio.unlock();

    let consumedTreat: string | null = null;
    if (action === 'treat') {
      consumedTreat = firstTreatId(save);
      if (!consumedTreat) {
        audio.play('error');
        this.showPetMessage(text.careNoTreat);
        return;
      }
      if (applyCare(this.needs, action).gained <= 0) {
        this.showPetMessage(text.care.full.treat);
        return;
      }
      save.consumeItem(consumedTreat);
    }

    const result = applyCare(this.needs, action);
    this.needs = result.needs;
    save.updateNeeds(this.needs);

    const awardedHearts = rewardCare(save, result.hearts);
    if (awardedHearts > 0) {
      this.spawnHearts(awardedHearts, this.petView.x, this.petView.y - 150);
    }

    this.playCareAnimation(action);
    this.refreshPetMood();
    this.emitHudState();

    if (action === 'feed') {
      this.completeTutorial();
    }
    if (consumedTreat) {
      const treat = getItem(consumedTreat);
      this.showPetMessage(text.care.treatTaste(treat?.label ?? ''));
    }

    if (result.gained <= 0) {
      this.showPetMessage(text.care.full[action]);
    }

    const feedback: CareFeedback = {
      action,
      hearts: awardedHearts,
      need: CARE_EFFECTS[action].need,
    };
    gameEvents.emit(GAME_EVENTS.CARE_FEEDBACK, feedback);
  }

  private playCareAnimation(action: CareAction): void {
    switch (action) {
      case 'feed':
      case 'treat':
        this.petView.playNod();
        if (this.room.id === 'living') {
          this.wobble(this.bowl);
          this.spawnFood();
        }
        audio.play('eat');
        this.time.delayedCall(220, () => audio.play(getPet(this.petId).voice));
        break;
      case 'play':
        this.petView.playJoy();
        if (this.room.id === 'living') {
          this.bounce(this.ball);
        }
        audio.play('play');
        this.time.delayedCall(180, () => audio.play(getPet(this.petId).voice));
        break;
      case 'pet':
        this.petView.playHop();
        if (this.room.id === 'living') {
          this.wobble(this.cushion);
        }
        audio.play('love');
        audio.play(getPet(this.petId).voice);
        break;
      case 'sleep':
        this.petView.playSleep();
        if (this.room.id === 'living') {
          this.wobble(this.cushion);
        }
        this.spawnSleepZ();
        audio.play('sleep');
        break;
    }
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
    if (!save.pet) {
      return;
    }
    const state: HudState = {
      petId: this.petId,
      petName: this.petName,
      needs: { ...this.needs },
      hearts: save.hearts,
      mood: moodOf(this.needs),
      treatCount: treatCount(save),
    };
    gameEvents.emit(GAME_EVENTS.HUD_STATE, state);
  }

  private persistNeeds(): void {
    if (save.pet) {
      save.updateNeeds(this.needs);
    }
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
    this.persistNeeds();
    this.scene.stop(SCENE_KEYS.HUD);
    this.scene.start(SCENE_KEYS.TOWN);
  }

  private handleShutdown(): void {
    this.persistNeeds();
    this.moodHeartsTimer?.remove();
    this.furnitureViews.clear();
    this.doorViews.length = 0;
    gameEvents.off(GAME_EVENTS.CARE_REQUESTED, this.handleCare, this);
    gameEvents.off(GAME_EVENTS.MENU_REQUESTED, this.returnToMenu, this);
    gameEvents.off(GAME_EVENTS.TOWN_REQUESTED, this.goToTown, this);
    gameEvents.off(GAME_EVENTS.DECOR_REQUESTED, this.togglePlacement, this);
    gameEvents.off(GAME_EVENTS.HUD_READY, this.emitHudState, this);
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
      background.fillRoundedRect(-98, -30, 196, 60, 22);
      background.lineStyle(4, COLORS.teal, 0.9);
      background.strokeRoundedRect(-98, -30, 196, 60, 22);

      const icon = this.add.graphics();
      icon.fillStyle(COLORS.teal, 1);
      icon.fillRoundedRect(-88, -18, 30, 40, 7);
      icon.fillStyle(COLORS.accent, 1);
      icon.fillCircle(-64, 2, 4);
      icon.lineStyle(3, COLORS.ink, 0.45);
      icon.strokeRoundedRect(-88, -18, 30, 40, 7);

      const label = this.add
        .text(10, 0, door.label, {
          fontFamily: FONT_FAMILY,
          fontSize: '22px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      container.add([background, icon, label]);
      container.setSize(196, 60);
      container.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 196, 60),
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
    if (target === this.room.id) {
      return;
    }

    if (this.placementMode) {
      this.exitPlacement();
    }

    this.room = getRoom(target);
    this.roomBackground?.destroy();
    this.roomBackground = this.add.image(GAME_WIDTH / 2, 360, this.room.assetKey).setDepth(0);
    this.clearDoors();
    this.createDoors();

    for (const view of this.furnitureViews.values()) {
      view.destroy(true);
    }
    this.furnitureViews.clear();
    this.createFurnitureViews();
    this.createFloorTrigger();

    this.moveTarget = null;
    const spawn = this.room.spawn;
    this.character.setPosition(spawn.x, spawn.y);
    this.character.setDepth(spawn.y);
    this.petView.setPosition(spawn.x + 150, spawn.y);
    this.petView.setDepth(spawn.y + 1);
    this.updateCareObjects();
    this.cameras.main.flash(180, 255, 255, 255);
  }

  private updateCareObjects(): void {
    const visible = this.room.id === 'living';
    this.bowl?.setVisible(visible);
    this.ball?.setVisible(visible);
    this.cushion?.setVisible(visible);
    this.tutorialRing?.setVisible(visible);
    this.tutorialArrow?.setVisible(visible);
  }

  private createFurnitureViews(): void {
    for (const placed of save.furniture) {
      if (placed.room === this.room.id) {
        this.createFurnitureView(placed);
      }
    }
  }

  private createFurnitureView(placed: {
    uid: string;
    itemId: string;
    room: RoomId;
    x: number;
    y: number;
  }): Phaser.GameObjects.Container | null {
    const item = getItem(placed.itemId);
    if (!item) {
      return null;
    }

    const footprint = footprintOf(item);
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

    view.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, footprint.width, footprint.height),
      Phaser.Geom.Rectangle.Contains,
    );
    view.on('pointerdown', () => this.selectFurniture(placed.uid));
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
      } else {
        view.setPosition(originX, originY);
        view.setDepth(Math.round(originY));
        this.showPlacementToast(text.placement.noSpace);
      }
      this.refreshInventoryPanel();
    });

    if (this.placementMode) {
      this.input.setDraggable(view, true);
    } else {
      view.disableInteractive();
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
    this.selectedUid = null;
    this.selectedItemId = null;
    this.movementHint?.destroy(true);
    this.movementHint = undefined;
    this.speechBubble?.destroy(true);
    this.speechBubble = undefined;

    for (const view of this.furnitureViews.values()) {
      view.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, view.width, view.height),
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

    for (const view of this.furnitureViews.values()) {
      this.input.setDraggable(view, false);
      view.disableInteractive();
    }

    gameEvents.emit(GAME_EVENTS.PLACEMENT_STATE, { active: false } satisfies PlacementState);
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
    save.removeFurniture(placed.uid);
    save.addItem(placed.itemId);
    this.selectedUid = null;
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
    this.ghost.setTint(valid ? 0xa7e6b8 : 0xffb3b3);
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
    audio.play('pop');
    this.refreshInventoryPanel();
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

  private createBowl(): Phaser.GameObjects.Container {
    const container = this.add.container(BOWL.x, BOWL.y).setDepth(BOWL.y);
    const graphics = this.add.graphics();

    graphics.fillStyle(COLORS.ink, 0.14);
    graphics.fillEllipse(0, -2, 104, 26);
    graphics.fillStyle(COLORS.teal, 1);
    graphics.fillRoundedRect(-46, -36, 92, 38, { tl: 12, tr: 12, bl: 20, br: 20 });
    graphics.fillStyle(COLORS.tealDark, 1);
    graphics.fillEllipse(0, -36, 92, 26);
    graphics.fillStyle(0xfff1dd, 1);
    graphics.fillEllipse(0, -36, 68, 16);
    graphics.fillStyle(0xe7b782, 1);
    graphics.fillEllipse(0, -35, 58, 11);
    graphics.lineStyle(3, COLORS.ink, 0.18);
    graphics.strokeEllipse(0, -36, 92, 26);

    container.add(graphics);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-58, -86, 116, 96),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => this.handleCare('feed'));
    return container;
  }

  private createBall(): Phaser.GameObjects.Container {
    const container = this.add.container(BALL.x, BALL.y).setDepth(BALL.y);
    const graphics = this.add.graphics();

    graphics.fillStyle(COLORS.ink, 0.14);
    graphics.fillEllipse(0, -2, 78, 22);
    graphics.fillStyle(COLORS.accent, 1);
    graphics.fillCircle(0, -34, 32);
    graphics.fillStyle(COLORS.primary, 0.9);
    graphics.fillCircle(-12, -44, 9);
    graphics.fillCircle(14, -24, 7);
    graphics.lineStyle(4, 0xffffff, 0.7);
    graphics.strokeCircle(0, -34, 32);
    graphics.lineStyle(3, COLORS.accentDark, 0.6);
    graphics.beginPath();
    graphics.arc(0, -34, 19, Math.PI * 1.1, Math.PI * 1.9);
    graphics.strokePath();

    container.add(graphics);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-52, -84, 104, 94),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => this.handleCare('play'));
    return container;
  }

  private createCushion(): Phaser.GameObjects.Container {
    const container = this.add.container(CUSHION.x, CUSHION.y).setDepth(CUSHION.y);
    const graphics = this.add.graphics();

    graphics.fillStyle(COLORS.ink, 0.14);
    graphics.fillEllipse(0, -2, 126, 26);
    graphics.fillStyle(COLORS.lavender, 1);
    graphics.fillRoundedRect(-60, -34, 120, 44, 18);
    graphics.fillStyle(0xdccaf3, 1);
    graphics.fillRoundedRect(-50, -28, 100, 30, 14);
    graphics.lineStyle(3, COLORS.ink, 0.16);
    graphics.strokeRoundedRect(-60, -34, 120, 44, 18);

    container.add(graphics);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-70, -82, 140, 94),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => this.handleCare('sleep'));
    return container;
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
        fontSize: '24px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const hint = this.add
      .text(-width / 2 + 92, 12, text.tutorial.feedHint, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
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

    this.tutorialRing = this.add
      .circle(BOWL.x, BOWL.y - 24, 70)
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

    const arrow = this.add.container(BOWL.x, BOWL.y - 122).setDepth(951);
    const arrowGraphics = this.add.graphics();
    arrowGraphics.fillStyle(COLORS.primary, 0.95);
    arrowGraphics.fillTriangle(-22, -18, 22, -18, 0, 20);
    arrow.add(arrowGraphics);
    if (!isReducedMotion()) {
      this.tweens.add({
        targets: arrow,
        y: BOWL.y - 132,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.tutorialArrow = arrow;
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
        fontSize: '21px',
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
        fontSize: '24px',
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

  private spawnFood(): void {
    if (!this.bowl || isReducedMotion()) {
      return;
    }

    for (let index = 0; index < 5; index += 1) {
      const bit = this.add
        .circle(
          this.bowl.x + Phaser.Math.Between(-22, 22),
          this.bowl.y - 52,
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
        fontSize: '22px',
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
