import { FC } from 'react';
import { SvgProps } from 'react-native-svg';

export const FoxiconVariant = {
  Agent: 'agent',
  Angel: 'angel',
  Astro: 'astro',
  Base: 'base',
  Cannibal: 'cannibal',
  Cyborg: 'cyborg',
  Frozen: 'frozen',
  Gentleman: 'gentleman',
  Goth: 'goth',
  Nerd: 'nerd',
  Pirate: 'pirate',
  Royal: 'royal',
  Superhero: 'superhero',
  Vr: 'vr',
  Zombie: 'zombie',
} as const;

export type FoxiconVariant =
  (typeof FoxiconVariant)[keyof typeof FoxiconVariant];

export type AssetByFoxiconVariant = Record<
  FoxiconVariant,
  FC<SvgProps & { name: string }>
>;

/**
 * Foxicon component props.
 */
export interface FoxiconProps {
  /**
   * The fox illustration to render.
   */
  variant: FoxiconVariant;
  /**
   * The width and height of the fox illustration in pixels.
   */
  size: number;
  /**
   * Optional test ID for the rendered SVG.
   */
  testID?: string;
}
