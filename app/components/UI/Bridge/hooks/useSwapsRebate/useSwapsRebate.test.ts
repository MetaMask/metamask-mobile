import { renderHook, waitFor } from '@testing-library/react-native';
import type { QuoteResponse } from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyRebateQuoteError,
} from '../../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { useSwapsRebate } from './useSwapsRebate';

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

const mockCall = Engine.controllerMessenger.call as jest.Mock;

const buildQuote = (assetId = 'eip155:1/slip44:60', usd = '10') =>
  ({
    feeData: {
      metabridge: [
        {
          amount: '1000',
          usd,
          asset: { assetId, decimals: 6, symbol: 'USDC' },
        },
      ],
    },
  }) as unknown as QuoteResponse['quote'];

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('useSwapsRebate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the rebate percentage for an eligible rebate', async () => {
    mockCall.mockResolvedValue({
      product: 'swaps',
      eligible: true,
      rebateBips: 1000,
      reason: null,
    });

    const { result } = renderHook(() => useSwapsRebate(buildQuote()));

    await waitFor(() => expect(result.current).toBe(10));
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getSwapsRebateQuote',
      expect.objectContaining({ feeData: expect.any(Object) }),
    );
  });

  it.each([
    { eligible: false, rebateBips: 0, reason: null },
    { eligible: true, rebateBips: 2000, reason: 'FEE_TOKEN_NOT_ELIGIBLE' },
  ])('returns null for an ineligible response %o', async (response) => {
    mockCall.mockResolvedValue({ product: 'swaps', ...response });

    const { result } = renderHook(() => useSwapsRebate(buildQuote()));
    await flushPromises();

    expect(result.current).toBeNull();
  });

  it.each([
    ['400', new RewardsMoneyRebateQuoteError(400, 'INVALID_REQUEST')],
    ['404 before deploy', new RewardsMoneyRebateQuoteError(404, 'FAILED')],
    ['413', new RewardsMoneyRebateQuoteError(413, 'INVALID_REQUEST')],
    ['429', new RewardsMoneyRebateQuoteError(429, 'RATE_LIMITED', '', 30)],
    ['503', new RewardsMoneyRebateQuoteError(503, 'UNAVAILABLE', '', 2)],
    ['malformed 200', new RewardsMoneyRebateQuoteError(200, 'FAILED')],
    ['401', new RewardsMoneyAuthorizationError('Unauthorized')],
    ['timeout', new Error('Request timed out')],
    ['feature disabled', new Error('Rewards Money is disabled')],
  ])('returns null and does not retry on %s', async (_label, error) => {
    mockCall.mockRejectedValue(error);

    const { result, rerender } = renderHook(
      ({ quote }) => useSwapsRebate(quote),
      { initialProps: { quote: buildQuote() } },
    );
    await flushPromises();
    rerender({ quote: buildQuote('eip155:1/slip44:60', '20') });
    await flushPromises();

    expect(result.current).toBeNull();
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('clears a previous rebate when the request for a new fee token fails', async () => {
    mockCall.mockResolvedValueOnce({
      product: 'swaps',
      eligible: true,
      rebateBips: 1000,
      reason: null,
    });
    mockCall.mockRejectedValueOnce(
      new RewardsMoneyRebateQuoteError(503, 'UNAVAILABLE'),
    );

    const { result, rerender } = renderHook(
      ({ quote }) => useSwapsRebate(quote),
      { initialProps: { quote: buildQuote() } },
    );
    await waitFor(() => expect(result.current).toBe(10));

    rerender({ quote: buildQuote('eip155:1/erc20:0xabc') });
    await flushPromises();

    expect(result.current).toBeNull();
  });

  it('does not call the controller without a quote', () => {
    renderHook(() => useSwapsRebate(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('refetches only when the fee token changes', async () => {
    mockCall.mockResolvedValue({
      product: 'swaps',
      eligible: true,
      rebateBips: 1000,
      reason: null,
    });

    const { result, rerender } = renderHook(
      ({ quote }) => useSwapsRebate(quote),
      { initialProps: { quote: buildQuote() } },
    );
    await waitFor(() => expect(result.current).toBe(10));

    rerender({ quote: buildQuote('eip155:1/slip44:60', '20') });
    expect(mockCall).toHaveBeenCalledTimes(1);

    rerender({ quote: buildQuote('eip155:1/erc20:0xabc') });
    await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
  });
});
