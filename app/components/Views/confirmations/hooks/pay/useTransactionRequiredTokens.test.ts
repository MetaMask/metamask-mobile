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
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';

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
  otherControllersMock,
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
        balance: '1.234',
        balanceFiat: '$12.34',
        chainId: '0x1',
        decimals: 18,
        symbol: 'ETH',
        tokenFiatAmount: 12.34,
      })
      .mockReturnValueOnce({
        address: TOKEN_ADDRESS_MOCK,
        balance: '2.345',
        balanceFiat: '#23.45',
        chainId: '0x1',
        decimals: 4,
        symbol: 'TST',
        tokenFiatAmount: 23.45,
      });
  });

  describe('returns gas fee token', () => {
    it('with max fee if greater than dollar and sufficient balance', () => {
      const tokens = runHook({
        transaction: {
          txParams: {
            maxFeePerGas: toHex(50000000000000),
            gas: '0x3',
          } as TransactionParams,
        },
      }).result.current;

      expect(tokens).toStrictEqual(
        expect.arrayContaining([
          {
            address: EMPTY_ADDRESS,
            allowUnderMinimum: true,
            amountHuman: '0.00015',
            amountRaw: '150000000000000',
            balanceHuman: '1.234',
            balanceRaw: '1234000000000000000',
            decimals: 18,
            skipIfBalance: true,
          },
        ]),
      );
    });

    it('with max fee if less than dollar and sufficient balance', () => {
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
            allowUnderMinimum: true,
            amountHuman: '0.000000000000000015',
            amountRaw: '15',
            balanceHuman: '1.234',
            balanceRaw: '1234000000000000000',
            decimals: 18,
            skipIfBalance: true,
          },
        ]),
      );
    });

    it('with max fee if greater than dollar and insufficient balance', () => {
      useTokenWithBalanceMock.mockReset();
      useTokenWithBalanceMock
        .mockReturnValueOnce({
          address: NATIVE_TOKEN_ADDRESS,
          balance: '0.000000000000000014',
          balanceFiat: '$0.00',
          chainId: '0x1',
          decimals: 18,
          symbol: 'ETH',
          tokenFiatAmount: 0,
        })
        .mockReturnValueOnce({
          address: TOKEN_ADDRESS_MOCK,
          balance: '2.345',
          balanceFiat: '#23.45',
          chainId: '0x1',
          decimals: 4,
          symbol: 'TST',
          tokenFiatAmount: 23.45,
        });

      const tokens = runHook({
        transaction: {
          txParams: {
            maxFeePerGas: toHex(50000000000000),
            gas: '0x3',
          } as TransactionParams,
        },
      }).result.current;

      expect(tokens).toStrictEqual(
        expect.arrayContaining([
          {
            address: EMPTY_ADDRESS,
            allowUnderMinimum: true,
            amountHuman: '0.00015',
            amountRaw: '150000000000000',
            balanceHuman: '0.000000000000000014',
            balanceRaw: '14',
            decimals: 18,
            skipIfBalance: true,
          },
        ]),
      );
    });

    it('with one dollar if max fee less than dollar and insufficient balance', () => {
      useTokenWithBalanceMock.mockReset();
      useTokenWithBalanceMock
        .mockReturnValueOnce({
          address: NATIVE_TOKEN_ADDRESS,
          balance: '0.000000000000000014',
          balanceFiat: '$0.00',
          chainId: '0x1',
          decimals: 18,
          symbol: 'ETH',
          tokenFiatAmount: 0,
        })
        .mockReturnValueOnce({
          address: TOKEN_ADDRESS_MOCK,
          balance: '2.345',
          balanceFiat: '#23.45',
          chainId: '0x1',
          decimals: 4,
          symbol: 'TST',
          tokenFiatAmount: 23.45,
        });

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
            allowUnderMinimum: true,
            amountHuman: '0.0001',
            amountRaw: '100000000000000',
            balanceHuman: '0.000000000000000014',
            balanceRaw: '14',
            decimals: 18,
            skipIfBalance: true,
          },
        ]),
      );
    });
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
          allowUnderMinimum: false,
          amountHuman: '0.0291',
          amountRaw: '291',
          balanceHuman: '2.345',
          balanceRaw: '23450',
          decimals: 4,
          skipIfBalance: false,
        },
      ]),
    );
  });
});
