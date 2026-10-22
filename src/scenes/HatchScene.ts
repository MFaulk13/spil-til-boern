import Phaser from 'phaser';
import { createPetState, getPet, type PetDefinition } from '@/game/catalog/pets';
import { EGG_TAP_COUNT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { isPetId, type PetId } from '@/game/types';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { EggView } from '@/ui/EggView';
import { PetView } from '@/ui/PetView';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const EGG_X = GAME_WIDTH / 2;
const EGG_GROUND_Y = 562;
const PET_X = 424;
const PET_GROUND_Y = 548;

const CRACK_LINES: readonly (readonly [number, number][])[] = [
  [
    [620, 408],
    [640, 436],
    [618, 462],
  ],
  [
    [662, 392],
    [646, 424],
    [668, 446],
  ],
  [
    [604, 470],
    [624, 486],
    [610, 512],
  ],
  [
    [674, 478],
    [654, 494],
    [674, 520],
  ],
  [
    [632, 380],
    [650, 404],
    [634, 424],
  ],
];

export class HatchScene extends Phaser.Scene {
  private petId: PetId = 'dog';
  private petDefinition!: PetDefinition;
  private taps = 0;
  private hatched = false;
  private egg?: EggView;
  private crackGraphics?: Phaser.GameObjects.Graphics;
  private instructionText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private tapIcon?: Phaser.GameObjects.Image;
  private selectedName = '';
  private namePanelOpen = false;
  private readonly nameButtons = new Map<string, Button>();

  constructor() {
    super(SCENE_KEYS.HATCH);
  }

  init(data: { petId?: unknown }): void {
    this.petId = isPetId(data.petId) ? data.petId : 'dog';
  }

  create(): void {
    this.taps = 0;
    this.hatched = false;
    this.selectedName = '';
    this.namePanelOpen = false;
    this.nameButtons.clear();
    this.petDefinition = getPet(this.petId);

    drawBackdrop(this);
    this.createRoom();
    this.createHeader();
    this.createNest();

    this.egg = new EggView(this, EGG_X, EGG_GROUND_Y, this.petDefinition, 1.25);
    this.crackGraphics = this.add.graphics().setDepth(20);

    const hitZone = this.add.rectangle(EGG_X, 430, 330, 330, 0xffffff, 0.001).setInteractive();
    hitZone.on('pointerdown', () => this.tapEgg());

    this.progressText = this.add
      .text(EGG_X, 682, text.hatch.progress(0, EGG_TAP_COUNT), {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-SPACE', () => this.tapEgg());
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.namePanelOpen) {
        this.finishHatch();
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.hatched) {
        this.scene.start(SCENE_KEYS.PET_SELECT);
      }
    });
  }

  private createRoom(): void {
    const floor = this.add.graphics();
    floor.fillStyle(0xe7b782, 1);
    floor.fillRect(0, 548, GAME_WIDTH, GAME_HEIGHT - 548);
    floor.lineStyle(6, COLORS.ink, 0.2);
    floor.lineBetween(0, 548, GAME_WIDTH, 548);
    floor.fillStyle(0xd59c63, 0.35);
    for (let x = 60; x < GAME_WIDTH; x += 150) {
      floor.fillRoundedRect(x, 596, 96, 4, 2);
      floor.fillRoundedRect(x + 40, 654, 96, 4, 2);
    }

    this.add.ellipse(EGG_X, 470, 660, 330, COLORS.accent, 0.12);
    this.add.image(200, 238, 'icon-star').setDisplaySize(44, 44).setAlpha(0.5).setAngle(-14);
    this.add.image(1080, 250, 'icon-heart').setDisplaySize(44, 44).setAlpha(0.5).setAngle(12);
  }

  private createHeader(): void {
    this.add
      .text(GAME_WIDTH / 2, 66, text.hatch.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '48px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.instructionText = this.add
      .text(GAME_WIDTH / 2, 126, text.hatch.instruction, {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, 170, text.hatch.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.tapIcon = this.add
      .image(GAME_WIDTH / 2 + 250, 132, 'icon-tap')
      .setDisplaySize(46, 46)
      .setAlpha(0.7);
    if (!isReducedMotion()) {
      this.tweens.add({
        targets: this.tapIcon,
        y: 122,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createNest(): void {
    const nest = this.add.graphics();
    nest.fillStyle(0xa9713f, 1);
    nest.fillEllipse(EGG_X, 574, 450, 128);
    nest.fillStyle(0x8c5a35, 1);
    nest.fillEllipse(EGG_X, 566, 360, 90);
    nest.lineStyle(5, 0xd9a566, 0.8);
    for (let index = 0; index < 12; index += 1) {
      const x = 460 + index * 30;
      nest.lineBetween(x, 536, x + 18, 592);
    }
    nest.lineStyle(4, 0x7a4a2a, 0.5);
    nest.lineBetween(452, 610, 828, 610);
    nest.lineBetween(480, 630, 800, 630);
  }

  private tapEgg(): void {
    if (this.hatched) {
      return;
    }
    this.taps += 1;
    audio.play('hatch');
    this.egg?.wobble();
    if (!isReducedMotion()) {
      this.cameras.main.shake(70, 0.0025);
    }
    this.drawCracks();
    this.progressText.setText(text.hatch.progress(this.taps, EGG_TAP_COUNT));

    if (this.taps >= EGG_TAP_COUNT) {
      this.hatch();
    }
  }

  private drawCracks(): void {
    if (!this.crackGraphics) {
      return;
    }
    this.crackGraphics.clear();
    this.crackGraphics.lineStyle(5, 0x3a2e2a, 0.9);
    const lines = Math.min(this.taps, CRACK_LINES.length);
    for (let index = 0; index < lines; index += 1) {
      const points = CRACK_LINES[index];
      this.crackGraphics.beginPath();
      this.crackGraphics.moveTo(points[0][0], points[0][1]);
      for (let point = 1; point < points.length; point += 1) {
        this.crackGraphics.lineTo(points[point][0], points[point][1]);
      }
      this.crackGraphics.strokePath();
    }
  }

  private hatch(): void {
    this.hatched = true;
    audio.play('reveal');
    this.cameras.main.flash(280, 255, 240, 200);
    this.instructionText.setVisible(false);
    this.hintText.setVisible(false);
    this.progressText.setVisible(false);
    if (this.tapIcon) {
      this.tweens.add({
        targets: this.tapIcon,
        alpha: 0,
        duration: 120,
        onComplete: () => this.tapIcon?.destroy(),
      });
    }

    const egg = this.egg;
    if (egg) {
      if (isReducedMotion()) {
        egg.destroy();
      } else {
        this.tweens.add({
          targets: egg,
          scale: 1.5,
          angle: 18,
          alpha: 0,
          duration: 260,
          ease: 'Quad.easeIn',
          onComplete: () => egg.destroy(),
        });
      }
    }
    this.crackGraphics?.setAlpha(0);
    if (!isReducedMotion()) {
      this.spawnBurst(EGG_X, 430);
    }
    this.showPet();
  }

  private showPet(): void {
    const pet = new PetView(this, PET_X, PET_GROUND_Y, 250, this.petId);
    pet.startIdle();
    if (!isReducedMotion()) {
      pet.setScale(0.35).setAlpha(0);
      this.tweens.add({
        targets: pet,
        scale: 1,
        alpha: 1,
        duration: 420,
        ease: 'Back.easeOut',
      });
    }

    this.add
      .text(PET_X, 208, text.hatch.reveal(this.petDefinition.label), {
        fontFamily: FONT_FAMILY,
        fontSize: '42px',
        color: COLORS.text,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 430 },
      })
      .setOrigin(0.5);

    const petHit = this.add
      .ellipse(PET_X, PET_GROUND_Y - 70, 240, 220, 0xffffff, 0.001)
      .setInteractive();
    petHit.on('pointerdown', () => {
      pet.playHop();
      audio.play(this.petDefinition.voice);
    });

    this.time.delayedCall(420, () => this.showNamePanel());
  }

  private showNamePanel(): void {
    const panelWidth = 520;
    const panelHeight = 424;
    const centerX = 900;
    const centerY = 400;

    const panel = this.add.container(centerX, centerY).setDepth(30);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 1);
    background.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);
    background.lineStyle(5, COLORS.accent, 0.95);
    background.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);

    const title = this.add
      .text(0, -panelHeight / 2 + 52, text.hatch.nameTitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    panel.add([background, title]);

    const names = this.petDefinition.names;
    this.selectedName = names[0] ?? this.petDefinition.label;

    this.namePanelOpen = true;
    names.forEach((name, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.input.keyboard?.on(
        `keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][index]}`,
        () => {
          if (this.namePanelOpen) {
            this.selectName(name);
          }
        },
      );
      const button = new Button(this, {
        x: column === 0 ? -118 : 118,
        y: -86 + row * 72,
        label: name,
        width: 210,
        height: 58,
        fontSize: 21,
        color: name === this.selectedName ? COLORS.accent : COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.selectName(name),
      });
      this.nameButtons.set(name, button);
      panel.add(button);
    });

    const done = new Button(this, {
      x: 0,
      y: panelHeight / 2 - 58,
      label: text.hatch.done,
      width: 260,
      height: 64,
      fontSize: 28,
      color: COLORS.primary,
      onClick: () => this.finishHatch(),
    });
    panel.add(done);

    if (isReducedMotion()) {
      return;
    }
    panel.setAlpha(0).setScale(0.94);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  private selectName(name: string): void {
    this.selectedName = name;
    for (const [buttonName, button] of this.nameButtons) {
      button.setColor(buttonName === name ? COLORS.accent : COLORS.panelLight);
    }
    audio.play('pop');
  }

  private finishHatch(): void {
    if (!this.namePanelOpen) {
      return;
    }
    this.namePanelOpen = false;
    save.setPet(createPetState(this.petId, this.selectedName));
    audio.play(this.petDefinition.voice);
    this.scene.start(SCENE_KEYS.HOME);
  }

  private spawnBurst(x: number, y: number): void {
    for (let index = 0; index < 20; index += 1) {
      const angle = (Math.PI * 2 * index) / 20 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const radius = Phaser.Math.Between(120, 260);
      const key = index % 4 === 0 ? 'icon-heart' : 'icon-star';
      const size = Phaser.Math.Between(22, 42);
      const spark = this.add
        .image(x, y, key)
        .setDisplaySize(size, size)
        .setAngle(Phaser.Math.Between(-40, 40))
        .setAlpha(0.95)
        .setDepth(25);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius - 40,
        angle: spark.angle + Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(620, 1050),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }
}
