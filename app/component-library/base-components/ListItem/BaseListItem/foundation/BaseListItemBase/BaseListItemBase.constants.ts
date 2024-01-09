/* eslint-disable import/prefer-default-export */

// Internal dependencies.
import {
  VerticalAlignment,
  BaseListItemBaseProps,
} from './BaseListItemBase.types';

// Test IDs
export const TESTID_BASELISTITEMBASE_GAP = 'baselistitembase-gap';

// Defaults
export const DEFAULT_BASELISTITEMBASE_GAP = 16;
export const DEFAULT_BASELISTITEMBASE_VERTICALALIGNMENT =
  VerticalAlignment.Center;

// Sample consts
export const SAMPLE_BASELISTITEMBASE_PROPS: BaseListItemBaseProps = {
  gap: DEFAULT_BASELISTITEMBASE_GAP,
  verticalAlignment: DEFAULT_BASELISTITEMBASE_VERTICALALIGNMENT,
};
