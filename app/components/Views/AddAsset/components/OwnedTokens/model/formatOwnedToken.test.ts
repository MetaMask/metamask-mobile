import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import type { CaipChainId } from '@metamask/utils';
import I18n from '../../../../../../../locales/i18n';
import { getLocaleLanguageCode } from '../../../../../hooks/useFormatters';
import { formatWithThreshold } from '../../../../../../util/assets';
import { formatCompactNumber } from '../../../../../UI/TokenDetails/utils/statBarFormat';
import {
  MISSING_FIAT,
  computeFiatValue,
  fiatMultiplierFromRates,
  formatOwnedTokenAmount,
  formatOwnedTokenFiat,
} from './formatOwnedToken';
import BigNumber from 'bignumber.js';

describe('formatOwnedTokenAmount', () => {
  const originalLocale = I18n.locale;

  beforeEach(() => {
    I18n.locale = 'en-US';
  });

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it('formats a 6-decimal readable amount with the wallet list threshold', () => {
    const chainId = 'eip155:1';
    const fractionDigits =
      MULTICHAIN_NETWORK_DECIMAL_PLACES[chainId as CaipChainId] || 5;

    const formatted = formatOwnedTokenAmount('1234.5', chainId);

    expect(formatted).toBe(
      formatWithThreshold(1234.5, 0.00001, 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
      }),
    );
  });

  it('formats an 18-decimal readable amount without treating it as a minimal unit', () => {
    const formatted = formatOwnedTokenAmount(
      '1.234567890123456789',
      'eip155:1',
    );

    expect(formatted.startsWith('1.23')).toBe(true);
    expect(formatted).not.toBe('0');
  });

  it('renders dust below the wallet threshold', () => {
    const formatted = formatOwnedTokenAmount('0.000000001', 'eip155:1');

    expect(formatted.startsWith('<')).toBe(true);
  });

  it('formats zero as a zero amount', () => {
    const formatted = formatOwnedTokenAmount('0', 'eip155:1');

    expect(formatted).toBe(
      formatWithThreshold(0, 0.00001, 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits:
          MULTICHAIN_NETWORK_DECIMAL_PLACES['eip155:1' as CaipChainId] || 5,
      }),
    );
  });

  it('uses compact notation for a 42-billion balance', () => {
    const formatted = formatOwnedTokenAmount('42000000000', 'eip155:1');

    expect(formatted).toBe(formatCompactNumber(42_000_000_000));
  });
});

describe('formatOwnedTokenFiat', () => {
  it('renders an em dash when the price is missing', () => {
    expect(formatOwnedTokenFiat(null, 'usd')).toBe(MISSING_FIAT);
  });

  it('formats a non-USD currency with the wallet fiat threshold', () => {
    const formatted = formatOwnedTokenFiat('12.5', 'eur');

    expect(formatted).toBe(
      formatWithThreshold(12.5, 0.01, getLocaleLanguageCode(), {
        style: 'currency',
        currency: 'EUR',
      }),
    );
  });
});

describe('fiat conversion', () => {
  it('multiplies a USD price into the selected currency with controller rates', () => {
    const multiplier = fiatMultiplierFromRates(true, 1.2, 1);
    const fiat = computeFiatValue(new BigNumber('10'), '2', multiplier);

    expect(fiat).toBe('24');
  });

  it('returns null fiat when a non-USD conversion rate is missing', () => {
    const multiplier = fiatMultiplierFromRates(true, undefined, undefined);

    expect(computeFiatValue(new BigNumber('10'), '2', multiplier)).toBeNull();
  });
});
