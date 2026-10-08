import { strings } from '../../../../../../locales/i18n';
import type { SliceKey } from '../../BalanceBreakdown/types';

const SLICE_LABEL_KEYS = {
  money: 'homepage.sections.money',
  tokens: 'homepage.sections.tokens',
  perps: 'homepage.sections.perps',
  predict: 'homepage.sections.predictions',
  defi: 'homepage.sections.defi',
} as const;

export const getSliceLabel = (key: SliceKey): string =>
  strings(SLICE_LABEL_KEYS[key]);
