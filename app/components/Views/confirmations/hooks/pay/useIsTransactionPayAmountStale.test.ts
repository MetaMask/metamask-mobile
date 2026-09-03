import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { useIsTransactionPayAmountStale } from './useIsTransactionPayAmountStale';

const TOKEN_ADDRESS_MOCK = '0x123' as Hex;

function createRequiredToken({
  amountRaw = '1000000',
  skipIfBalance = false,
}: {
  amountRaw?: string;
  skipIfBalance?: boolean;
} = {}): TransactionPayRequiredToken {
  return {
    address: TOKEN_ADDRESS_MOCK,
    amountRaw,
    skipIfBalance,
  } as TransactionPayRequiredToken;
}

function runHook({
  isMaxAmount = false,
  isPostQuote = false,
  tokens,
}: {
  isMaxAmount?: boolean;
  isPostQuote?: boolean;
  tokens?: TransactionPayRequiredToken[];
} = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    {
      engine: {
        backgroundState: {
          TransactionPayController: {
            transactionData: {
              [transactionIdMock]: {
                isLoading: false,
                isMaxAmount,
                isPostQuote,
                tokens,
              },
            },
          },
        },
      },
    },
  );

  return renderHookWithProvider(useIsTransactionPayAmountStale, { state });
}

describe('useIsTransactionPayAmountStale', () => {
  it('returns false when required tokens are missing', () => {
    const { result } = runHook({ tokens: undefined });

    expect(result.current).toBe(false);
  });

  it('returns false when required tokens are empty', () => {
    const { result } = runHook({ tokens: [] });

    expect(result.current).toBe(false);
  });

  it('returns true when a required token has amountRaw zero', () => {
    const { result } = runHook({
      tokens: [createRequiredToken({ amountRaw: '0' })],
    });

    expect(result.current).toBe(true);
  });

  it('returns false when required tokens have a non-zero amount', () => {
    const { result } = runHook({
      tokens: [createRequiredToken({ amountRaw: '1000000' })],
    });

    expect(result.current).toBe(false);
  });

  it('returns false when only a skipIfBalance token has amountRaw zero', () => {
    const { result } = runHook({
      tokens: [
        createRequiredToken({ amountRaw: '0', skipIfBalance: true }),
        createRequiredToken({ amountRaw: '1000000' }),
      ],
    });

    expect(result.current).toBe(false);
  });

  it('returns true when any non-skipIfBalance token has amountRaw zero', () => {
    const { result } = runHook({
      tokens: [
        createRequiredToken({ amountRaw: '1000000' }),
        createRequiredToken({ amountRaw: '0' }),
      ],
    });

    expect(result.current).toBe(true);
  });

  it('returns false for post-quote max when amountRaw is zero', () => {
    const { result } = runHook({
      isMaxAmount: true,
      isPostQuote: true,
      tokens: [createRequiredToken({ amountRaw: '0' })],
    });

    expect(result.current).toBe(false);
  });

  it('returns true for post-quote non-max when amountRaw is zero', () => {
    const { result } = runHook({
      isMaxAmount: false,
      isPostQuote: true,
      tokens: [createRequiredToken({ amountRaw: '0' })],
    });

    expect(result.current).toBe(true);
  });

  it('returns true for pre-quote max when amountRaw is zero', () => {
    const { result } = runHook({
      isMaxAmount: true,
      isPostQuote: false,
      tokens: [createRequiredToken({ amountRaw: '0' })],
    });

    expect(result.current).toBe(true);
  });
});
