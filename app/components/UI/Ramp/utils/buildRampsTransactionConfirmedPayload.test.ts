import { RampsOrderStatus } from '@metamask/ramps-controller';
import {
  buildRampsTransactionConfirmedPayload,
  shouldEmitRampsTransactionConfirmed,
} from './buildRampsTransactionConfirmedPayload';

const baseOrder = {
  providerOrderId: 'ord-1',
  status: RampsOrderStatus.Pending,
  fiatAmount: 100,
  cryptoAmount: 0.05,
  exchangeRate: 2000,
  networkFees: 1,
  partnerFees: 2,
  totalFeesFiat: 3,
  paymentMethod: { id: 'card' },
  network: { chainId: 'eip155:1', name: 'Ethereum' },
  cryptoCurrency: { assetId: 'eth', symbol: 'ETH' },
  fiatCurrency: { symbol: 'USD' },
  region: 'US',
};

describe('shouldEmitRampsTransactionConfirmed', () => {
  it('returns true for non-terminal failure statuses', () => {
    expect(
      shouldEmitRampsTransactionConfirmed(RampsOrderStatus.Pending),
    ).toBe(true);
    expect(
      shouldEmitRampsTransactionConfirmed(RampsOrderStatus.Completed),
    ).toBe(true);
  });

  it('returns false for terminal failure statuses', () => {
    expect(shouldEmitRampsTransactionConfirmed(RampsOrderStatus.Failed)).toBe(
      false,
    );
    expect(
      shouldEmitRampsTransactionConfirmed(RampsOrderStatus.IdExpired),
    ).toBe(false);
  });
});

describe('buildRampsTransactionConfirmedPayload', () => {
  it('builds the unified buy payload with ramp_type UNIFIED_BUY_2', () => {
    const payload = buildRampsTransactionConfirmedPayload(baseOrder, {
      rampType: 'UNIFIED_BUY_2',
      region: 'US',
    });

    expect(payload).toEqual({
      ramp_type: 'UNIFIED_BUY_2',
      ramp_surface: undefined,
      amount_source: 100,
      amount_destination: 0.05,
      exchange_rate: 2000,
      gas_fee: 1,
      processing_fee: 2,
      total_fee: 3,
      payment_method_id: 'card',
      country: 'US',
      region: 'US',
      chain_id: 'eip155:1',
      currency_destination: 'eth',
      currency_destination_symbol: 'ETH',
      currency_destination_network: 'Ethereum',
      currency_source: 'USD',
    });
  });

  it('includes ramp_surface for headless flows', () => {
    const payload = buildRampsTransactionConfirmedPayload(baseOrder, {
      rampType: 'HEADLESS',
      region: 'GB',
      rampSurface: 'MONEY_ACCOUNT',
    });

    expect(payload.ramp_type).toBe('HEADLESS');
    expect(payload.ramp_surface).toBe('MONEY_ACCOUNT');
    expect(payload.country).toBe('GB');
  });
});
