import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { useAutomaticTransactionPayToken } from './useAutomaticTransactionPayToken';
import { useTransactionPayToken } from './useTransactionPayToken';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionType } from '@metamask/transaction-controller';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';

jest.mock('./useTransactionPayToken');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');
jest.mock('../../../../../util/address');
jest.mock('../../../../../selectors/transactionPayController');
jest.mock('./useTransactionPayData');

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectEnabledSourceChains: jest.fn(),
}));

const TOKEN_ADDRESS_1_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_ADDRESS_2_MOCK = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const TOKEN_ADDRESS_3_MOCK = '0xabc1234567890abcdef1234567890abcdef12345678';
const REQUIRED_BALANCE_MOCK = 10;
const CHAIN_ID_1_MOCK = '0x1';
const CHAIN_ID_2_MOCK = '0x2';

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              type: TransactionType.perpsDeposit,
            },
          ],
        },
      },
    },
  },
);

function runHook({ disable = false } = {}) {
  return renderHookWithProvider(
    () => useAutomaticTransactionPayToken({ disable }),
    {
      state: STATE_MOCK,
    },
  );
}

describe('useAutomaticTransactionPayToken', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);
  const selectEnabledSourceChainsMock = jest.mocked(selectEnabledSourceChains);
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    selectEnabledSourceChainsMock.mockReturnValue([]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK as Hex,
      } as TransactionPayRequiredToken,
    ]);

    isHardwareAccountMock.mockReturnValue(false);
  });

  it('selects target token if has balance', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 20,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('selects token with highest balance on same chain if insufficient balance on target token', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 0,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 5,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 20,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 1,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_3_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('selects token with highest balance on alternate chain if insufficient balance on same chain', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 0,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 0,
      },
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 20,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 0,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: 1,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_3_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('selects target token if insufficient balance on all chains', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK - 1,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK - 1,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 1,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: 1,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('does nothing if no required tokens', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    useTransactionPayRequiredTokensMock.mockReturnValue([]);

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('does not select token if no native balance on chain', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK - 1,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 5,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 20,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 0,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: 1,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_3_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });

  it('always selects target token if hardware wallet', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK - 1,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK - 2,
      },
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 20,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 1,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: 1,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    isHardwareAccountMock.mockReturnValue(true);

    runHook();

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_1_MOCK,
      chainId: CHAIN_ID_1_MOCK,
    });
  });

  it('returns number of tokens with balance', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK - 1,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK - 2,
      },
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK + 20,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 1,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: 1,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    const { result } = runHook();

    expect(result.current.count).toBe(6);
  });

  it('selected nothing if disabled', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook({ disable: true });

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  describe('preferredPaymentToken', () => {
    const PREFERRED_TOKEN_ADDRESS = '0xpreferred' as Hex;
    const PREFERRED_CHAIN_ID = '0x2' as Hex;

    it('selects preferred token when available with sufficient balance', () => {
      useTokensWithBalanceMock.mockReturnValue([
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
          tokenFiatAmount: REQUIRED_BALANCE_MOCK,
        },
        {
          address: PREFERRED_TOKEN_ADDRESS,
          chainId: PREFERRED_CHAIN_ID,
          tokenFiatAmount: REQUIRED_BALANCE_MOCK + 5,
        },
        {
          address: TOKEN_ADDRESS_3_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          tokenFiatAmount: REQUIRED_BALANCE_MOCK + 100,
        },
        {
          address: NATIVE_TOKEN_ADDRESS,
          chainId: CHAIN_ID_1_MOCK,
          tokenFiatAmount: 1,
        },
        {
          address: NATIVE_TOKEN_ADDRESS,
          chainId: PREFERRED_CHAIN_ID,
          tokenFiatAmount: 1,
        },
        {
          address: NATIVE_TOKEN_ADDRESS,
          chainId: CHAIN_ID_2_MOCK,
          tokenFiatAmount: 1,
        },
      ] as unknown as ReturnType<typeof useTokensWithBalance>);

      const preferredPaymentToken = {
        address: PREFERRED_TOKEN_ADDRESS,
        chainId: PREFERRED_CHAIN_ID,
      };

      renderHookWithProvider(
        () => useAutomaticTransactionPayToken({ preferredPaymentToken }),
        {
          state: STATE_MOCK,
        },
      );

      expect(setPayTokenMock).toHaveBeenCalledWith(preferredPaymentToken);
    });

    it('falls back to default selection when preferred token not found', () => {
      useTokensWithBalanceMock.mockReturnValue([
        {
          address: TOKEN_ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
          tokenFiatAmount: REQUIRED_BALANCE_MOCK,
        },
        {
          address: TOKEN_ADDRESS_3_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          tokenFiatAmount: REQUIRED_BALANCE_MOCK + 10,
        },
        {
          address: NATIVE_TOKEN_ADDRESS,
          chainId: CHAIN_ID_1_MOCK,
          tokenFiatAmount: 1,
        },
        {
          address: NATIVE_TOKEN_ADDRESS,
          chainId: CHAIN_ID_2_MOCK,
          tokenFiatAmount: 1,
        },
      ] as unknown as ReturnType<typeof useTokensWithBalance>);

      const preferredPaymentToken = {
        address: '0xnotfound' as Hex,
        chainId: '0x999' as Hex,
      };

      renderHookWithProvider(
        () => useAutomaticTransactionPayToken({ preferredPaymentToken }),
        {
          state: STATE_MOCK,
        },
      );

      expect(setPayTokenMock).toHaveBeenCalledWith({
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
      });
    });

    it('preferred token takes priority over highest balance token', () => {
      useTokensWithBalanceMock.mockReturnValue([
        {
          address: TOKEN_ADDRESS_3_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          tokenFiatAmount: REQUIRED_BALANCE_MOCK + 100,
        },
        {
          address: PREFERRED_TOKEN_ADDRESS,
          chainId: PREFERRED_CHAIN_ID,
          tokenFiatAmount: REQUIRED_BALANCE_MOCK + 1,
        },
        {
          address: NATIVE_TOKEN_ADDRESS,
          chainId: CHAIN_ID_2_MOCK,
          tokenFiatAmount: 1,
        },
        {
          address: NATIVE_TOKEN_ADDRESS,
          chainId: PREFERRED_CHAIN_ID,
          tokenFiatAmount: 1,
        },
      ] as unknown as ReturnType<typeof useTokensWithBalance>);

      const preferredPaymentToken = {
        address: PREFERRED_TOKEN_ADDRESS,
        chainId: PREFERRED_CHAIN_ID,
      };

      renderHookWithProvider(
        () => useAutomaticTransactionPayToken({ preferredPaymentToken }),
        {
          state: STATE_MOCK,
        },
      );

      expect(setPayTokenMock).toHaveBeenCalledWith(preferredPaymentToken);
    });
  });

  it('does not select token when payToken already set', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_2_MOCK as Hex,
        chainId: CHAIN_ID_2_MOCK as Hex,
        balanceFiat: '',
        balanceHuman: '',
        balanceRaw: '',
        balanceUsd: '',
        decimals: 0,
        symbol: '',
      },
      setPayToken: setPayTokenMock,
    });

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: REQUIRED_BALANCE_MOCK,
      },
      {
        address: NATIVE_TOKEN_ADDRESS,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: 1,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });
});
