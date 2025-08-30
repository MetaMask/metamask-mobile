import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import {
  BalanceOverride,
  useAutomaticTransactionPayToken,
} from './useAutomaticTransactionPayToken';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';

jest.mock('./useTransactionPayToken');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');
jest.mock('./useTransactionRequiredFiat');
jest.mock('./useTransactionRequiredTokens');

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectEnabledSourceChains: jest.fn(),
}));

const TOKEN_ADDRESS_1_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_ADDRESS_2_MOCK = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const TOKEN_ADDRESS_3_MOCK = '0xabc1234567890abcdef1234567890abcdef12345678';
const TOTAL_FIAT_MOCK = 123.456;
const CHAIN_ID_1_MOCK = '0x1';
const CHAIN_ID_2_MOCK = '0x2';

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
);

function runHook({
  balanceOverrides,
}: { balanceOverrides?: BalanceOverride[] } = {}) {
  return renderHookWithProvider(
    () => useAutomaticTransactionPayToken({ balanceOverrides }),
    {
      state: STATE_MOCK,
    },
  );
}

describe('useAutomaticTransactionPayToken', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);
  const selectEnabledSourceChainsMock = jest.mocked(selectEnabledSourceChains);

  const useTransactionRequiredFiatMock = jest.mocked(
    useTransactionRequiredFiat,
  );

  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
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

    useTransactionRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
      },
    ] as unknown as ReturnType<typeof useTransactionRequiredTokens>);

    useTransactionRequiredFiatMock.mockReturnValue({
      totalFiat: TOTAL_FIAT_MOCK,
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);
  });

  it('selects target token if sufficient balance', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 20,
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
        tokenFiatAmount: TOTAL_FIAT_MOCK - 1,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 5,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 20,
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
        tokenFiatAmount: TOTAL_FIAT_MOCK - 1,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK - 2,
      },
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 10,
      },
      {
        address: TOKEN_ADDRESS_3_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 20,
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
        tokenFiatAmount: TOTAL_FIAT_MOCK - 1,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK - 1,
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
        tokenFiatAmount: TOTAL_FIAT_MOCK,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    useTransactionRequiredTokensMock.mockReturnValue([]);

    runHook();

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('selects token based on balance override', () => {
    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_1_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 9,
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_2_MOCK,
        tokenFiatAmount: TOTAL_FIAT_MOCK + 10,
      },
    ] as unknown as ReturnType<typeof useTokensWithBalance>);

    runHook({
      balanceOverrides: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          balance: TOTAL_FIAT_MOCK + 10,
          chainId: CHAIN_ID_1_MOCK,
        },
      ],
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_2_MOCK,
      chainId: CHAIN_ID_2_MOCK,
    });
  });
});
