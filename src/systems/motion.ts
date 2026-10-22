import { save } from '@/systems/save';

export function isReducedMotion(): boolean {
  return save.reduceMotion;
}

export function motionDuration(duration: number): number {
  return save.reduceMotion ? 0 : duration;
}

export function motionRepeat(repeat: number): number {
  return save.reduceMotion ? 0 : repeat;
}

export function motionYoyo(yoyo: boolean): boolean {
  return save.reduceMotion ? false : yoyo;
}
