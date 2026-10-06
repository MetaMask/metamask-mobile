import { strings } from '../../../../../locales/i18n';
import type { CollectorCryptPack } from '../providers/collector-crypt/types';

export const DEMO_PACK_CODE = 'local_reveal_demo';
export const DEMO_ARTWORK_CODE = 'pokemon_25';

/** Explicit local opt-in; release builds cannot run this preview. */
export const isGachaDevEnabled = (): boolean =>
  __DEV__ && process.env.MM_GACHA_REVEAL_DEMO === 'true';

/** UI-only pack. Its code must never be sent to a provider. */
export const createDemoPack = (
  packs: CollectorCryptPack[],
): CollectorCryptPack => ({
  shortName: 'Demo',
  category: 'Pokemon',
  instantBuybackPercent: 0,
  odds: { common: 0.8, uncommon: 0.15, rare: 0.04, epic: 0.01 },
  maxValue: 0,
  menuOrder: null,
  ...packs.find((pack) => pack.code === DEMO_ARTWORK_CODE),
  code: DEMO_PACK_CODE,
  name: strings('gacha.demo.title'),
  price: 0,
});
