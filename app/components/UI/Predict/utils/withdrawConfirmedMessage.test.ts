import { RootState } from '../../../../reducers';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';
import { getWithdrawConfirmedMessage } from './withdrawConfirmedMessage';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

jest.mock('../../../../selectors/transactionController', () => ({
  selectTransactionMetadataById: jest.fn(),
}));

jest.mock('../../../../selectors/tokensController', () => ({
  selectSingleTokenByAddressAndChainId: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectTickerByChainId: jest.fn(),
}));

const mockState = {} as unknown as RootState;
const selectTxMeta = selectTransactionMetadataById as unknown as jest.Mock;
const selectToken =
  selectSingleTokenByAddressAndChainId as unknown as jest.Mock;
const selectTicker = selectTickerByChainId as unknown as jest.Mock;

describe('getWithdrawConfirmedMessage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns original USDC subtitle when no transactionId is provided', () => {
    const result = getWithdrawConfirmedMessage(mockState, undefined, 50);

    expect(result.title).toBe('predict.withdraw.withdraw_completed');
    expect(result.description).toContain('withdraw_completed_subtitle');
    expect(result.description).toContain('$50');
    expect(selectTxMeta).not.toHaveBeenCalled();
  });

  it('returns original USDC subtitle when transaction has no metamaskPay', () => {
    selectTxMeta.mockReturnValue({});

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 100);

    expect(result.description).toContain('withdraw_completed_subtitle');
    expect(result.description).toContain('$100');
  });

  it('returns original USDC subtitle when isPostQuote is false', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: { isPostQuote: false },
    });

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 42);

    expect(result.description).toContain('withdraw_completed_subtitle');
  });

  it('uses targetFiat and resolved token for post-quote withdrawals', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '25.50',
        chainId: '0x38',
        tokenAddress: '0xusdt',
      },
    });
    selectToken.mockReturnValue({ symbol: 'USDT' });

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 10);

    expect(result.description).toContain(
      'withdraw_any_token_completed_subtitle',
    );
    expect(result.description).toContain('$25.50');
    expect(result.description).toContain('USDT');
  });

  it('falls back to network ticker when wallet token is not found', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '5',
        chainId: '0x38',
        tokenAddress: '0xunknown',
      },
    });
    selectToken.mockReturnValue(undefined);
    selectTicker.mockReturnValue('BNB');

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 5);

    expect(result.description).toContain('BNB');
  });

  it('falls back to USDC when both token selectors return undefined', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '10',
        chainId: '0x38',
        tokenAddress: '0xabc',
      },
    });
    selectToken.mockReturnValue(undefined);
    selectTicker.mockReturnValue(undefined);

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 10);

    expect(result.description).toContain('USDC');
  });

  it('falls back to event amount when targetFiat is undefined', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: undefined,
        chainId: '0x1',
        tokenAddress: '0xabc',
      },
    });
    selectToken.mockReturnValue(undefined);
    selectTicker.mockReturnValue('ETH');

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 77);

    expect(result.description).toContain('$77');
  });

  it('falls back to event amount when targetFiat is zero', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '0',
        chainId: '0x1',
        tokenAddress: '0xabc',
      },
    });
    selectToken.mockReturnValue(undefined);
    selectTicker.mockReturnValue('ETH');

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 30);

    expect(result.description).toContain('$30');
  });

  it('falls back to event amount when targetFiat is negative', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '-5',
        chainId: '0x1',
        tokenAddress: '0xabc',
      },
    });
    selectToken.mockReturnValue(undefined);
    selectTicker.mockReturnValue('ETH');

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 20);

    expect(result.description).toContain('$20');
  });

  it('falls back to event amount when targetFiat is NaN', () => {
    selectTxMeta.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: 'not-a-number',
        chainId: '0x1',
        tokenAddress: '0xabc',
      },
    });
    selectToken.mockReturnValue(undefined);
    selectTicker.mockReturnValue('ETH');

    const result = getWithdrawConfirmedMessage(mockState, 'tx-1', 15);

    expect(result.description).toContain('$15');
  });
});
