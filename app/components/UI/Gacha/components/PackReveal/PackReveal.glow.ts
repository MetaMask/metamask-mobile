import { Platform, type PlatformOSType, type ViewStyle } from 'react-native';

export interface GlowOptions {
  /** Six-digit hex color of the light. */
  color: string;
  /** iOS `shadowRadius`, in points. */
  radius: number;
  /** iOS `shadowOpacity`, from 0 to 1. */
  opacity: number;
  /**
   * Alpha of the view's own background, from 0 to 1. Without a computed shadow path,
   * iOS derives the shadow from the layer's pixels, so a translucent fill dims the
   * glow. Android's box shadow ignores the fill and needs the same attenuation.
   */
  fillAlpha?: number;
}

/**
 * Converts an opacity from 0 to 1 into a two-digit hex alpha suffix.
 *
 * @param opacity - Opacity from 0 to 1, clamped outside that range.
 * @returns The alpha suffix, for example `55` for one third.
 */
export const toAlphaHex = (opacity: number): string =>
  Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');

/**
 * Returns a centered glow that looks the same on both platforms.
 *
 * iOS keeps its layer shadow. Android ignores `shadow*` props without elevation, so it
 * gets the New Architecture `boxShadow` (Android 9+). React Native draws a CSS blur
 * radius as half its value in iOS points, so the Android blur is twice the iOS radius.
 *
 * @param options - Glow color, radius, opacity and background alpha.
 * @param os - Target platform; defaults to the running one.
 * @returns A static style to place before any animated style.
 */
export const glowStyle = (
  { color, radius, opacity, fillAlpha = 1 }: GlowOptions,
  os: PlatformOSType = Platform.OS,
): ViewStyle =>
  os === 'android'
    ? {
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 0,
            blurRadius: radius * 2,
            color: `${color}${toAlphaHex(opacity * fillAlpha)}`,
          },
        ],
      }
    : {
        shadowColor: color,
        shadowOpacity: opacity,
        shadowRadius: radius,
        shadowOffset: { width: 0, height: 0 },
      };
