import type { Colors } from '../../../../util/theme/models';

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace(/^#/, '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized.slice(0, 6);

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  if (
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    return hex;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Matches the existing Lightweight chart volume colors (30% opacity
 * success/error) while keeping candle colors vivid.
 */
export function getPerpsVolumeColors(colors: Colors): {
  success: string;
  error: string;
} {
  return {
    success: hexToRgba(colors.success.default, 0.3),
    error: hexToRgba(colors.error.default, 0.3),
  };
}
