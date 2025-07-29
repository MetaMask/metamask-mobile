import { cloneDeep, merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  TransactionMeta,
  TransactionParams,
} from '@metamask/transaction-controller';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { Interface } from '@ethersproject/abi';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { toHex } from '@metamask/controller-utils';

jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');

const TOKEN_ADDRESS_MOCK = '0x1234567890123456789012345678901234567890';
const TO_MOCK = '0x0987654321098765432109876543210987654321';

const STATE_MOCK = merge(
  {
    engine: {
      backgroundState,
    },
  },
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
);

function runHook({
  transaction,
}: { transaction?: Partial<TransactionMeta> } = {}) {
  const state = cloneDeep(STATE_MOCK);

  if (transaction) {
    state.engine.backgroundState.TransactionController.transactions[0] = merge(
      state.engine.backgroundState.TransactionController.transactions[0],
      transaction,
    );
  }

  return renderHookWithProvider(useTransactionRequiredTokens, {
    state,
  });
}

describe('useTransactionRequiredTokens', () => {
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);

  beforeEach(() => {
    jest.clearAllMocks();
    useTokensWithBalanceMock.mockReturnValue([]);
  });

  it('returns gas token', () => {
    const tokens = runHook({
      transaction: {
        txParams: {
          maxFeePerGas: '0x3',
          gas: '0x5',
        } as TransactionParams,
      },
    }).result.current;

    expect(tokens).toStrictEqual(
      expect.arrayContaining([
        {
          address: EMPTY_ADDRESS,
          amount: '0xf',
        },
      ]),
    );
  });

  it('returns value token', () => {
    const tokens = runHook({
      transaction: {
        txParams: {
          maxFeePerGas: '0x0',
          value: '0x123',
        } as TransactionParams,
      },
    }).result.current;

    expect(tokens).toStrictEqual(
      expect.arrayContaining([
        {
          address: EMPTY_ADDRESS,
          amount: '0x123',
        },
      ]),
    );
  });

  it('returns combined gas and value tokens', () => {
    const tokens = runHook({
      transaction: {
        txParams: {
          maxFeePerGas: '0x2',
          gas: '0x3',
          value: '0x4',
        } as TransactionParams,
      },
    }).result.current;

    expect(tokens).toStrictEqual(
      expect.arrayContaining([
        {
          address: EMPTY_ADDRESS,
          amount: '0xa',
        },
      ]),
    );
  });

  it('returns token transfer token', () => {
    const tokens = runHook({
      transaction: {
        txParams: {
          data: new Interface(abiERC20).encodeFunctionData('transfer', [
            TO_MOCK,
            '0x123',
          ]),
          to: TOKEN_ADDRESS_MOCK,
        } as TransactionParams,
      },
    }).result.current;

    expect(tokens).toStrictEqual(
      expect.arrayContaining([
        {
          address: TOKEN_ADDRESS_MOCK,
          amount: '0x123',
        },
      ]),
    );
  });

  it('subtracts balance from tokens', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        balance: '3',
        symbol: 'TST',
        decimals: 4,
        chainId: '0x1',
      },
    ]);

    const tokens = runHook({
      transaction: {
        txParams: {
          data: new Interface(abiERC20).encodeFunctionData('transfer', [
            TO_MOCK,
            toHex(100000),
          ]),
          to: TOKEN_ADDRESS_MOCK,
        } as TransactionParams,
      },
    }).result.current;

    expect(tokens).toStrictEqual(
      expect.arrayContaining([
        {
          address: TOKEN_ADDRESS_MOCK,
          amount: toHex(70000),
        },
      ]),
    );
  });
});
