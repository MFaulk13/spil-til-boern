import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY_KEYS, SCENE_KEYS, STAR_GOAL } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const PANEL_WIDTH = 660;
const PANEL_HEIGHT = 400;

export class UiScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private soundButton!: Button;
  private winPanel!: Phaser.GameObjects.Container;
  private winBody!: Phaser.GameObjects.Text;
  private winBest!: Phaser.GameObjects.Text;
  private panelVisible = false;

  constructor() {
    super(SCENE_KEYS.UI);
  }

  create(): void {
    this.createTopBar();
    this.createWinPanel();
    this.refresh();

    this.registry.events.on(Phaser.Data.Events.CHANGE_DATA, this.refresh, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off(Phaser.Data.Events.CHANGE_DATA, this.refresh, this);
    });
  }

  private createTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(COLORS.backgroundBottom, 0.62);
    bar.fillRect(0, 0, GAME_WIDTH, 112);
    bar.fillStyle(COLORS.accent, 0.85);
    bar.fillRect(0, 110, GAME_WIDTH, 3);

    this.scoreText = this.add
      .text(40, 56, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '42px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.soundButton = new Button(this, {
      x: GAME_WIDTH - 316,
      y: 56,
      label: '',
      width: 190,
      height: 66,
      fontSize: 26,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.toggleSound(),
    });

    new Button(this, {
      x: GAME_WIDTH - 106,
      y: 56,
      label: text.menu,
      width: 160,
      height: 66,
      fontSize: 26,
      color: COLORS.primary,
      onClick: () => this.goToMenu(),
    });
  }

  private createWinPanel(): void {
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 1);
    panel.fillRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 40);
    panel.lineStyle(6, COLORS.accent, 0.9);
    panel.strokeRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 40);

    const title = this.add
      .text(0, -PANEL_HEIGHT / 2 + 76, text.winTitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '68px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.winBody = this.add
      .text(0, -14, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.winBest = this.add
      .text(0, 36, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    const againButton = new Button(this, {
      x: 0,
      y: PANEL_HEIGHT / 2 - 84,
      label: text.playAgain,
      width: 300,
      height: 88,
      fontSize: 38,
      color: COLORS.accent,
      onClick: () => this.restartGame(),
    });

    this.winPanel = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        backdrop,
        panel,
        title,
        this.winBody,
        this.winBest,
        againButton,
      ])
      .setVisible(false);
  }

  private refresh(): void {
    const stars = this.registry.get(REGISTRY_KEYS.STARS) ?? 0;
    const goal = this.registry.get(REGISTRY_KEYS.GOAL) ?? STAR_GOAL;
    const best = this.registry.get(REGISTRY_KEYS.BEST) ?? save.bestScore;
    const complete = this.registry.get(REGISTRY_KEYS.COMPLETE) === true;
    const newRecord = this.registry.get(REGISTRY_KEYS.NEW_RECORD) === true;

    this.scoreText.setText(text.score(Number(stars), Number(goal)));
    this.soundButton.setLabel(audio.isEnabled ? text.soundOn : text.soundOff);

    if (complete) {
      this.winBody.setText(text.winBody(Number(goal)));
      this.winBest.setText(newRecord ? text.newRecord : text.winBest(Number(best)));
      this.showWinPanel();
    } else {
      this.panelVisible = false;
      this.winPanel.setVisible(false).setAlpha(1).setScale(1);
    }
  }

  private showWinPanel(): void {
    if (this.panelVisible) {
      return;
    }
    this.panelVisible = true;
    this.winPanel.setVisible(true).setAlpha(0).setScale(0.9);
    this.tweens.add({
      targets: this.winPanel,
      alpha: 1,
      scale: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });
  }

  private toggleSound(): void {
    audio.setEnabled(!audio.isEnabled);
    save.setSoundEnabled(audio.isEnabled);
    this.soundButton.setLabel(audio.isEnabled ? text.soundOn : text.soundOff);
  }

  private restartGame(): void {
    this.scene.stop(SCENE_KEYS.GAME);
    this.scene.start(SCENE_KEYS.GAME);
  }

  private goToMenu(): void {
    this.scene.stop(SCENE_KEYS.GAME);
    this.scene.start(SCENE_KEYS.MENU);
  }
}
