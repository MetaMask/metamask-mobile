import {
  TransactionPayRequiredToken,
  TransactionPaySourceAmount,
} from '@metamask/transaction-pay-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionPayHasSourceAmount } from './useTransactionPayHasSourceAmount';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { Hex } from '@metamask/utils';
import {
  ConfirmationContextParams,
  useConfirmationContext,
} from '../../context/confirmation-context';

jest.mock('../../context/confirmation-context');

const TOKEN_ADDRESS_MOCK = '0x123' as Hex;
const OTHER_TOKEN_ADDRESS_MOCK = '0x456' as Hex;

function createSourceAmount(
  targetTokenAddress: Hex,
): TransactionPaySourceAmount {
  return {
    targetTokenAddress,
  } as unknown as TransactionPaySourceAmount;
}

function createRequiredToken(
  address: Hex,
  skipIfBalance: boolean,
): TransactionPayRequiredToken {
  return {
    address,
    skipIfBalance,
  } as unknown as TransactionPayRequiredToken;
}

function runHook({
  sourceAmounts = [],
  tokens = [],
}: {
  sourceAmounts?: TransactionPaySourceAmount[];
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
                sourceAmounts,
                tokens,
              },
            },
          },
        },
      },
    },
  );

  return renderHookWithProvider(useTransactionPayHasSourceAmount, { state });
}

describe('useTransactionPayHasSourceAmount', () => {
  const useConfirmationContextMock = jest.mocked(useConfirmationContext);

  beforeEach(() => {
    jest.resetAllMocks();

    useConfirmationContextMock.mockReturnValue({
      isTransactionDataUpdating: false,
    } as ConfirmationContextParams);
  });

  it('returns true when there are non-optional source amounts', () => {
    const { result } = runHook({
      sourceAmounts: [createSourceAmount(TOKEN_ADDRESS_MOCK)],
      tokens: [createRequiredToken(TOKEN_ADDRESS_MOCK, false)],
    });

    expect(result.current).toBe(true);
  });

  it('returns false when source amounts are empty', () => {
    const { result } = runHook({
      sourceAmounts: [],
      tokens: [createRequiredToken(TOKEN_ADDRESS_MOCK, false)],
    });

    expect(result.current).toBe(false);
  });

  it('returns false when all source amounts are optional', () => {
    const { result } = runHook({
      sourceAmounts: [createSourceAmount(TOKEN_ADDRESS_MOCK)],
      tokens: [createRequiredToken(TOKEN_ADDRESS_MOCK, true)],
    });

    expect(result.current).toBe(false);
  });

  it('returns false when source amounts do not match required tokens', () => {
    const { result } = runHook({
      sourceAmounts: [createSourceAmount(OTHER_TOKEN_ADDRESS_MOCK)],
      tokens: [createRequiredToken(TOKEN_ADDRESS_MOCK, false)],
    });

    expect(result.current).toBe(false);
  });
});
