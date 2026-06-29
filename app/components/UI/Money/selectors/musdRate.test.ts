import { CHAIN_IDS } from '@metamask/transaction-controller';
import { toChecksumAddress } from '../../../../util/address';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../Earn/constants/musd';
import { selectMusdFiatRate } from './musdRate';

const MONAD_CHAIN_ID = CHAIN_IDS.MONAD;
const MONAD_MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[MONAD_CHAIN_ID];
const MONAD_MUSD_ASSET_ID = MUSD_TOKEN_ASSET_ID_BY_CHAIN[MONAD_CHAIN_ID];
const MONAD_MUSD_CHECKSUM_ADDRESS = toChecksumAddress(MONAD_MUSD_ADDRESS);

describe('selectMusdFiatRate', () => {
  it('returns assets price for Monad mUSD when assets unify state is enabled', () => {
    const assetsPrice = {
      [MONAD_MUSD_ASSET_ID]: { price: 1.2345 },
    };

    const result = selectMusdFiatRate.resultFunc(
      true,
      assetsPrice as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBe(1.2345);
  });

  it('returns undefined when Monad mUSD price is missing in unified assets state', () => {
    const assetsPrice = {};

    const result = selectMusdFiatRate.resultFunc(
      true,
      assetsPrice as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBeUndefined();
  });

  it('returns fiat rate from checksummed legacy marketData entry', () => {
    const marketData = {
      [MONAD_CHAIN_ID]: {
        [MONAD_MUSD_CHECKSUM_ADDRESS]: { price: 2 },
      },
    };
    const currencyRates = {
      MON: { conversionRate: 3 },
    };
    const networkConfigurations = {
      [MONAD_CHAIN_ID]: { nativeCurrency: 'MON' },
    };

    const result = selectMusdFiatRate.resultFunc(
      false,
      {} as never,
      marketData as never,
      currencyRates as never,
      networkConfigurations as never,
    );

    expect(result).toBe(6);
  });

  it('returns fiat rate from lowercase legacy marketData entry when checksum key is absent', () => {
    const marketData = {
      [MONAD_CHAIN_ID]: {
        [MONAD_MUSD_ADDRESS]: { price: 2.5 },
      },
    };
    const currencyRates = {
      MON: { conversionRate: 4 },
    };
    const networkConfigurations = {
      [MONAD_CHAIN_ID]: { nativeCurrency: 'MON' },
    };

    const result = selectMusdFiatRate.resultFunc(
      false,
      {} as never,
      marketData as never,
      currencyRates as never,
      networkConfigurations as never,
    );

    expect(result).toBe(10);
  });

  it('returns undefined when legacy conversion rate for Monad native currency is missing', () => {
    const marketData = {
      [MONAD_CHAIN_ID]: {
        [MONAD_MUSD_CHECKSUM_ADDRESS]: { price: 2 },
      },
    };
    const networkConfigurations = {
      [MONAD_CHAIN_ID]: { nativeCurrency: 'MON' },
    };

    const result = selectMusdFiatRate.resultFunc(
      false,
      {} as never,
      marketData as never,
      {} as never,
      networkConfigurations as never,
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when legacy marketData has no Monad mUSD entry', () => {
    const marketData = {
      [MONAD_CHAIN_ID]: {},
    };
    const currencyRates = {
      MON: { conversionRate: 3 },
    };
    const networkConfigurations = {
      [MONAD_CHAIN_ID]: { nativeCurrency: 'MON' },
    };

    const result = selectMusdFiatRate.resultFunc(
      false,
      {} as never,
      marketData as never,
      currencyRates as never,
      networkConfigurations as never,
    );

    expect(result).toBeUndefined();
  });
});
