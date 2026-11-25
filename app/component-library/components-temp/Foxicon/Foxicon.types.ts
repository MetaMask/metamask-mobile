import { ImageSourcePropType } from 'react-native';

export const FoxiconVariant = {
  Agent: 'agent',
  Astro: 'astro',
  Athlete: 'athlete',
  Aviator: 'aviator',
  Beanie: 'beanie',
  Chrome: 'chrome',
  Football: 'football',
  Frozen: 'frozen',
  Goth: 'goth',
  Hearts: 'hearts',
  Laser: 'laser',
  Nerd: 'nerd',
  Vr: 'vr',
  Zombie: 'zombie',
} as const;

export type FoxiconVariant =
  (typeof FoxiconVariant)[keyof typeof FoxiconVariant];

/**
 * Looks with no artwork in the current set, including ones dropped after an
 * earlier build shipped them. They stay valid so saved avatars keep rendering,
 * and draw {@link FOXICON_FALLBACK_VARIANT} instead.
 */
export const RetiredFoxiconVariant = {
  Angel: 'angel',
  Base: 'base',
  Cannibal: 'cannibal',
  Cyborg: 'cyborg',
  Gentleman: 'gentleman',
  Magma: 'magma',
  Pirate: 'pirate',
  Royal: 'royal',
  Superhero: 'superhero',
} as const;

export type RetiredFoxiconVariant =
  (typeof RetiredFoxiconVariant)[keyof typeof RetiredFoxiconVariant];

export const FOXICON_FALLBACK_VARIANT: FoxiconVariant = FoxiconVariant.Astro;

export type AssetByFoxiconVariant = Record<FoxiconVariant, ImageSourcePropType>;

/**
 * Foxicon component props.
 */
export interface FoxiconProps {
  /**
   * The fox illustration to render. Retired or unknown variants render
   * {@link FOXICON_FALLBACK_VARIANT}.
   */
  variant: FoxiconVariant | RetiredFoxiconVariant;
  /**
   * The width and height of the fox illustration in pixels.
   */
  size: number;
  /**
   * Optional test ID for the rendered image.
   */
  testID?: string;
}
