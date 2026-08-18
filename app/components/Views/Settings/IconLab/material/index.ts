/**
 * GENERATED barrel for the vendored Material Symbols variants.
 *
 * Material Symbols axes: style (outlined/rounded/sharp) x fill (0/1). There is
 * no duotone axis — that is Phosphor-only. Weight (100-700) ships as separate
 * npm packages and is not vendored here.
 */
import type React from 'react';
import { OUTLINED } from './outlined';
import { OUTLINED_FILL } from './outlined-fill';
import { ROUNDED } from './rounded';
import { ROUNDED_FILL } from './rounded-fill';
import { SHARP } from './sharp';
import { SHARP_FILL } from './sharp-fill';

type IconComponent = React.ComponentType<Record<string, unknown>>;

export type MaterialStyle = 'outlined' | 'rounded' | 'sharp';

export const MATERIAL_STYLES: readonly MaterialStyle[] = [
  'outlined',
  'rounded',
  'sharp',
];

/** Keyed by `${style}` and `${style}-fill`. */
export const MATERIAL_VARIANTS: Record<string, Record<string, IconComponent>> = {
  'outlined': OUTLINED,
  'outlined-fill': OUTLINED_FILL,
  'rounded': ROUNDED,
  'rounded-fill': ROUNDED_FILL,
  'sharp': SHARP,
  'sharp-fill': SHARP_FILL,
};

export const materialVariantKey = (
  style: MaterialStyle,
  filled: boolean,
): string => (filled ? `${style}-fill` : style);
