import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SliceKey } from '../../../BalanceBreakdown/types';

export const SLICE_ICONS: Partial<Record<SliceKey, IconName>> = {
  money: IconName.Musd,
  tokens: IconName.Ethereum,
  predict: IconName.Predictions,
};

export const SLICE_ICON_SYMBOLS: Partial<Record<SliceKey, string>> = {
  perps: '∞',
  defi: '%',
};

const SLICE_LABEL_KEYS = {
  money: 'homepage.sections.money',
  tokens: 'homepage.sections.tokens',
  perps: 'homepage.sections.perpetuals',
  predict: 'homepage.sections.predictions',
  defi: 'homepage.sections.defi',
} as const;

export const getSliceLabel = (key: SliceKey): string =>
  strings(SLICE_LABEL_KEYS[key]);
