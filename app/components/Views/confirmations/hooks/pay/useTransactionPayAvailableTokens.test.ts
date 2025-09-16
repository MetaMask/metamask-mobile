import { merge, noop } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import {
  TransactionToken,
  useTransactionRequiredTokens,
} from './useTransactionRequiredTokens';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { Hex } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';

jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');
jest.mock('./useTransactionPayToken');
jest.mock('./useTransactionRequiredTokens');

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectEnabledSourceChains: jest.fn(),
}));

const CHAIN_ID_MOCK = '0x1' as Hex;
const CHAIN_ID_2_MOCK = '0x2' as Hex;

const TOKEN_1_MOCK = {
  address: '0xToken1',
  chainId: CHAIN_ID_MOCK,
  tokenFiatAmount: 1,
} as BridgeToken;

const TOKEN_2_MOCK = {
  address: '0xToken2',
  chainId: CHAIN_ID_MOCK,
  tokenFiatAmount: 1,
} as BridgeToken;

const NATIVE_TOKEN_1_MOCK = {
  ...TOKEN_1_MOCK,
  address: NATIVE_TOKEN_ADDRESS,
} as BridgeToken;

function runHook({
  chainIds,
  type,
}: { chainIds?: Hex[]; type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
  );

  if (type) {
    (
      state.engine.backgroundState
        .TransactionController as TransactionControllerState
    ).transactions[0].type = type;
  }

  return renderHookWithProvider(
    () => useTransactionPayAvailableTokens({ chainIds }),
    {
      state,
    },
  );
}

describe('useTransactionPayAvailableTokens', () => {
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const selectEnabledSourceChainsMock = jest.mocked(selectEnabledSourceChains);

  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionRequiredTokensMock.mockReturnValue([]);
    selectEnabledSourceChainsMock.mockReturnValue([]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: noop,
    });
  });

  it('returns tokens if has fiat and native balance', () => {
    useTokensWithBalanceMock.mockReturnValue([
      TOKEN_1_MOCK,
      TOKEN_2_MOCK,
      NATIVE_TOKEN_1_MOCK,
    ]);

    const { result } = runHook();

    expect(result.current.availableTokens).toStrictEqual([
      TOKEN_1_MOCK,
      TOKEN_2_MOCK,
      NATIVE_TOKEN_1_MOCK,
    ]);
  });

  it('does not return token if no fiat', () => {
    useTokensWithBalanceMock.mockReturnValue([
      { ...TOKEN_1_MOCK, tokenFiatAmount: 0 },
      TOKEN_2_MOCK,
      NATIVE_TOKEN_1_MOCK,
    ]);

    const { result } = runHook();

    expect(result.current.availableTokens).toStrictEqual([
      TOKEN_2_MOCK,
      NATIVE_TOKEN_1_MOCK,
    ]);
  });

  it('does not return token if perps deposit and insufficient fiat', () => {
    useTokensWithBalanceMock.mockReturnValue([
      { ...TOKEN_1_MOCK, tokenFiatAmount: 9.99 },
      NATIVE_TOKEN_1_MOCK,
    ]);

    const { result } = runHook({ type: TransactionType.perpsDeposit });

    expect(result.current.availableTokens).toStrictEqual([]);
  });

  it('does not return token if no native', () => {
    useTokensWithBalanceMock.mockReturnValue([TOKEN_1_MOCK, TOKEN_2_MOCK]);

    const { result } = runHook();

    expect(result.current.availableTokens).toStrictEqual([]);
  });

  it('does not return token if chain IDs provided and do not match', () => {
    useTokensWithBalanceMock.mockReturnValue([
      TOKEN_1_MOCK,
      { ...TOKEN_2_MOCK, chainId: CHAIN_ID_2_MOCK },
      NATIVE_TOKEN_1_MOCK,
      { ...NATIVE_TOKEN_1_MOCK, chainId: CHAIN_ID_2_MOCK },
    ]);

    const { result } = runHook({ chainIds: [CHAIN_ID_2_MOCK] });

    expect(result.current.availableTokens).toStrictEqual([
      { ...TOKEN_2_MOCK, chainId: CHAIN_ID_2_MOCK },
      { ...NATIVE_TOKEN_1_MOCK, chainId: CHAIN_ID_2_MOCK },
    ]);
  });

  it('returns required token even if no fiat or native balance', () => {
    useTransactionRequiredTokensMock.mockReturnValue([
      TOKEN_1_MOCK as unknown as TransactionToken,
    ]);

    useTokensWithBalanceMock.mockReturnValue([
      { ...TOKEN_1_MOCK, tokenFiatAmount: 0 },
      TOKEN_2_MOCK,
    ]);

    const { result } = runHook();

    expect(result.current.availableTokens).toStrictEqual([
      { ...TOKEN_1_MOCK, tokenFiatAmount: 0 },
    ]);
  });

  it('returns selected token even if no fiat or native balance', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_1_MOCK as never,
      setPayToken: noop,
    });

    useTokensWithBalanceMock.mockReturnValue([
      { ...TOKEN_1_MOCK, tokenFiatAmount: 0 },
      TOKEN_2_MOCK,
    ]);

    const { result } = runHook();

    expect(result.current.availableTokens).toStrictEqual([
      { ...TOKEN_1_MOCK, tokenFiatAmount: 0 },
    ]);
  });

  it('returns available chain IDs', () => {
    useTokensWithBalanceMock.mockReturnValue([
      TOKEN_1_MOCK,
      { ...TOKEN_2_MOCK, chainId: CHAIN_ID_2_MOCK },
      NATIVE_TOKEN_1_MOCK,
      { ...NATIVE_TOKEN_1_MOCK, chainId: CHAIN_ID_2_MOCK },
    ]);

    const { result } = runHook();

    expect(result.current.availableChainIds).toStrictEqual([
      CHAIN_ID_MOCK,
      CHAIN_ID_2_MOCK,
    ]);
  });
});
