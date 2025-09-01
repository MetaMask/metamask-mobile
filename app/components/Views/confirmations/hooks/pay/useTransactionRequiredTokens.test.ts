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
import { toHex } from '@metamask/controller-utils';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';

jest.mock('../tokens/useTokenWithBalance');

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
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenWithBalanceMock
      .mockReturnValueOnce({
        address: NATIVE_TOKEN_ADDRESS,
        balance: '0',
        balanceFiat: '0',
        tokenFiatAmount: 0,
        symbol: 'ETH',
        decimals: 18,
        chainId: '0x1',
      })
      .mockReturnValueOnce({
        address: TOKEN_ADDRESS_MOCK,
        balance: '0',
        balanceFiat: '0',
        tokenFiatAmount: 0,
        symbol: 'TST',
        decimals: 4,
        chainId: '0x1',
      });
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
        expect.objectContaining({
          address: EMPTY_ADDRESS,
          amountHuman: '0.000000000000000015',
          amountRaw: '15',
          decimals: 18,
          skipIfBalance: true,
        }),
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
        expect.objectContaining({
          address: TOKEN_ADDRESS_MOCK,
          amountHuman: '0.0291',
          amountRaw: '291',
          decimals: 4,
          skipIfBalance: false,
        }),
      ]),
    );
  });

  it('returns token balances', () => {
    useTokenWithBalanceMock.mockReset();
    useTokenWithBalanceMock
      .mockReturnValueOnce({
        address: NATIVE_TOKEN_ADDRESS,
        balance: '0',
        balanceFiat: '0',
        tokenFiatAmount: 0,
        symbol: 'ETH',
        decimals: 18,
        chainId: '0x1',
      })
      .mockReturnValueOnce({
        address: TOKEN_ADDRESS_MOCK,
        balance: '3',
        balanceFiat: '3',
        tokenFiatAmount: 3,
        symbol: 'TST',
        decimals: 4,
        chainId: '0x1',
      });

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
          amountHuman: '10',
          amountRaw: '100000',
          balanceHuman: '3',
          balanceRaw: '30000',
          decimals: 4,
          skipIfBalance: false,
        },
      ]),
    );
  });
});
