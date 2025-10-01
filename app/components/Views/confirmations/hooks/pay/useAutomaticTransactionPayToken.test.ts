import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { useAutomaticTransactionPayToken } from './useAutomaticTransactionPayToken';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionType } from '@metamask/transaction-controller';

jest.mock('./useTransactionPayToken');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');
jest.mock('./useTransactionRequiredFiat');
jest.mock('./useTransactionRequiredTokens');
jest.mock('../../../../../util/address');

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

function runHook() {
  return renderHookWithProvider(useAutomaticTransactionPayToken, {
    state: STATE_MOCK,
  });
}

describe('useAutomaticTransactionPayToken', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);
  const selectEnabledSourceChainsMock = jest.mocked(selectEnabledSourceChains);
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);

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

    useTransactionRequiredTokensMock.mockReturnValue([]);

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

  it('returns number of tokens with sufficient balance', () => {
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

    expect(result.current.count).toBe(2);
  });
});
