import type Phaser from 'phaser';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { shouldShowRotateHint } from '@/utils/viewport';

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

function hasCoarsePointer(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function isTouchDevice(): boolean {
  return hasCoarsePointer() || navigator.maxTouchPoints > 0;
}

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    navigatorWithStandalone.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

function createRotateHint(): HTMLDivElement {
  const hint = document.createElement('div');
  hint.className = 'rotate-hint';
  hint.dataset.visible = 'false';
  hint.setAttribute('role', 'status');
  hint.setAttribute('aria-live', 'polite');

  const phone = document.createElement('div');
  phone.className = 'rotate-hint__phone';
  phone.setAttribute('aria-hidden', 'true');

  const title = document.createElement('h2');
  title.textContent = text.mobile.rotateTitle;

  const body = document.createElement('p');
  body.textContent = text.mobile.rotateBody;

  hint.append(phone, title, body);
  document.body.append(hint);
  return hint;
}

async function tryEnterFullscreen(game: Phaser.Game): Promise<void> {
  if (!isTouchDevice() || document.fullscreenElement || isStandalone()) {
    return;
  }

  const root = document.documentElement as FullscreenElement;
  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: 'hide' });
    } else if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
    } else {
      return;
    }
  } catch {
    return;
  }

  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    await orientation?.lock?.('landscape');
  } catch {
    // Some browsers do not allow orientation locking.
  }

  refreshScale(game);
}

function refreshScale(game: Phaser.Game): void {
  try {
    game.scale.refresh();
  } catch {
    // The game may already be shutting down.
  }
}

export function bindMobileDisplay(game: Phaser.Game): () => void {
  const hint = createRotateHint();
  let paused = false;

  const pauseForOrientation = (): void => {
    if (paused) {
      return;
    }
    paused = true;
    audio.stopMusic();
    try {
      game.loop.sleep();
    } catch {
      // The game may already be shutting down.
    }
  };

  const resumeAfterOrientation = (): void => {
    if (!paused) {
      return;
    }
    paused = false;
    try {
      game.loop.wake();
    } catch {
      // The game may already be shutting down.
    }
    if (!document.hidden) {
      audio.unlock();
    }
  };

  const update = (): void => {
    const width = Math.round(window.visualViewport?.width ?? window.innerWidth);
    const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
    const show = shouldShowRotateHint(width, height, hasCoarsePointer());
    hint.dataset.visible = show ? 'true' : 'false';

    if (show) {
      pauseForOrientation();
    } else if (!document.hidden) {
      resumeAfterOrientation();
    }

    refreshScale(game);
  };

  const handleFirstPointer = (): void => {
    void tryEnterFullscreen(game);
  };

  const handleFullscreenChange = (): void => {
    refreshScale(game);
  };

  const handleVisibilityChange = (): void => {
    if (!document.hidden) {
      update();
    }
  };

  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('pointerdown', handleFirstPointer, { once: true, passive: true });
  window.visualViewport?.addEventListener('resize', update);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  update();

  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    window.removeEventListener('pointerdown', handleFirstPointer);
    window.visualViewport?.removeEventListener('resize', update);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    hint.remove();
  };
}
