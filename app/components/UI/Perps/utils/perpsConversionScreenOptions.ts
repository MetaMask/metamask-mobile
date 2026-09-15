import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { transparentModalScreenOptions } from '../../../../constants/navigation/clearStackNavigatorOptions';

/**
 * Resolve the assignment once per navigator with `{ trackExposure: false }` and
 * pass it to every converted screen — each router records its own exposure when
 * the user actually opens that flow.
 */
export const getPerpsConversionScreenOptions = (
  isBottomSheet: boolean,
  baseOptions: NativeStackNavigationOptions,
): NativeStackNavigationOptions =>
  isBottomSheet
    ? { ...baseOptions, ...transparentModalScreenOptions }
    : baseOptions;
