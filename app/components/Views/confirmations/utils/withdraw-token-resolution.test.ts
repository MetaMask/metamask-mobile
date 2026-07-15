import {
  resolveWithdrawTokenInfo,
  WithdrawTokenInfo,
} from './withdraw-token-resolution';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';
import type { RootState } from '../../../../reducers';

jest.mock('../../../../selectors/transactionController');
jest.mock('../../../../selectors/tokensController');
jest.mock('../../../../selectors/networkController');

const mockSelectTxById = jest.mocked(selectTransactionMetadataById);
const mockSelectToken = jest.mocked(selectSingleTokenByAddressAndChainId);
const mockSelectTicker = jest.mocked(selectTickerByChainId);

const EMPTY_STATE = {} as RootState;

const NON_POST_QUOTE: WithdrawTokenInfo = {
  isPostQuote: false,
  targetFiat: undefined,
  tokenSymbol: 'USDC',
};

describe('resolveWithdrawTokenInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTxById.mockReturnValue(undefined);
    mockSelectToken.mockReturnValue(undefined);
    mockSelectTicker.mockReturnValue(undefined as never);
  });

  it('returns non-post-quote defaults when transactionId is undefined', () => {
    expect(resolveWithdrawTokenInfo(EMPTY_STATE, undefined)).toEqual(
      NON_POST_QUOTE,
    );
  });

  it('returns non-post-quote defaults when transaction not found', () => {
    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'missing-tx')).toEqual(
      NON_POST_QUOTE,
    );
  });

  it('returns non-post-quote defaults when metamaskPay.isPostQuote is false', () => {
    mockSelectTxById.mockReturnValue({
      metamaskPay: { isPostQuote: false },
    } as never);

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual(
      NON_POST_QUOTE,
    );
  });

  it('returns non-post-quote defaults when metamaskPay is missing', () => {
    mockSelectTxById.mockReturnValue({} as never);

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual(
      NON_POST_QUOTE,
    );
  });

  it('resolves token symbol from tokenAddress + chainId', () => {
    mockSelectTxById.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '0.25',
        chainId: '0xa4b1',
        tokenAddress: '0xtoken',
      },
    } as never);
    mockSelectToken.mockReturnValue({ symbol: 'BNB' } as never);

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual({
      isPostQuote: true,
      targetFiat: 0.25,
      tokenSymbol: 'BNB',
    });
  });

  it('falls back to network ticker when token not found', () => {
    mockSelectTxById.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '1.50',
        chainId: '0xa4b1',
        tokenAddress: '0xunknown',
      },
    } as never);
    mockSelectToken.mockReturnValue(undefined);
    mockSelectTicker.mockReturnValue('ETH');

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual({
      isPostQuote: true,
      targetFiat: 1.5,
      tokenSymbol: 'ETH',
    });
  });

  it('falls back to USDC when neither token nor ticker found', () => {
    mockSelectTxById.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '2.00',
      },
    } as never);

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual({
      isPostQuote: true,
      targetFiat: 2,
      tokenSymbol: 'USDC',
    });
  });

  it('returns undefined targetFiat when targetFiat is zero', () => {
    mockSelectTxById.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '0',
      },
    } as never);

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual({
      isPostQuote: true,
      targetFiat: undefined,
      tokenSymbol: 'USDC',
    });
  });

  it('returns undefined targetFiat when targetFiat is NaN', () => {
    mockSelectTxById.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: 'invalid',
      },
    } as never);

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual({
      isPostQuote: true,
      targetFiat: undefined,
      tokenSymbol: 'USDC',
    });
  });

  it('uses ticker fallback when chainId is present but tokenAddress is missing', () => {
    mockSelectTxById.mockReturnValue({
      metamaskPay: {
        isPostQuote: true,
        targetFiat: '5.00',
        chainId: '0x1',
      },
    } as never);
    mockSelectTicker.mockReturnValue('ETH');

    expect(resolveWithdrawTokenInfo(EMPTY_STATE, 'tx-1')).toEqual({
      isPostQuote: true,
      targetFiat: 5,
      tokenSymbol: 'ETH',
    });
    expect(mockSelectToken).not.toHaveBeenCalled();
  });
});
