import { ARC_USDC_BRIDGE_TOKEN } from '../../../../../../enablement/assets/arc';
import type { BridgeToken } from '../../../types';
import { getQuoteEventWarningState } from './BridgeMarketView.utils';

const ETH_TOKEN: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1',
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};

describe('getQuoteEventWarningState', () => {
  it('maps Arc USDC native reserve errors to insufficient gas warnings', () => {
    expect(
      getQuoteEventWarningState({
        hasInsufficientGas: false,
        hasInsufficientNativeReserveError: true,
        sourceToken: ARC_USDC_BRIDGE_TOKEN,
      }),
    ).toStrictEqual({
      hasInsufficientGas: true,
      hasInsufficientNativeReserveError: false,
    });
  });

  it('keeps non-Arc native reserve errors as native reserve warnings', () => {
    expect(
      getQuoteEventWarningState({
        hasInsufficientGas: false,
        hasInsufficientNativeReserveError: true,
        sourceToken: ETH_TOKEN,
      }),
    ).toStrictEqual({
      hasInsufficientGas: false,
      hasInsufficientNativeReserveError: true,
    });
  });

  it('preserves existing insufficient gas warnings', () => {
    expect(
      getQuoteEventWarningState({
        hasInsufficientGas: true,
        hasInsufficientNativeReserveError: false,
        sourceToken: ETH_TOKEN,
      }),
    ).toStrictEqual({
      hasInsufficientGas: true,
      hasInsufficientNativeReserveError: false,
    });
  });
});
