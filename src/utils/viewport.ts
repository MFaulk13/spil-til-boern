export function shouldShowRotateHint(
  width: number,
  height: number,
  coarsePointer: boolean,
): boolean {
  return coarsePointer && height > width && width > 0 && width <= 1024;
}
