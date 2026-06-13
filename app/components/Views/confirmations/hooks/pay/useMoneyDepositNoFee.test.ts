import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useMoneyDepositNoFee } from './useMoneyDepositNoFee';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectMoneyNoFeeTokens } from '../../../../UI/Money/selectors/featureFlags';

jest.mock('react-redux');
jest.mock('./useTransactionPayToken');
jest.mock('../transactions/useTransactionMetadataRequest');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseTransactionPayToken =
  useTransactionPayToken as jest.MockedFunction<typeof useTransactionPayToken>;
const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.MockedFunction<
    typeof useTransactionMetadataRequest
  >;

const PAY_TOKEN = {
  address: '0xabc' as Hex,
  balanceHuman: '10',
  balanceFiat: '10',
  balanceRaw: '10000',
  balanceUsd: '10',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

describe('useMoneyDepositNoFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    mockUseTransactionPayToken.mockReturnValue({
      payToken: PAY_TOKEN,
      setPayToken: jest.fn(),
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMetaMaskPayFlags) {
        return { noNetworkFeeChains: [] };
      }
      if (selector === selectMoneyNoFeeTokens) {
        return {};
      }
      return undefined;
    });
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.moneyAccountWithdraw,
  ])(
    'returns true for %s when pay token chain is in noNetworkFeeChains',
    (type) => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type,
        txParams: { from: '0x123' },
      } as never);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMetaMaskPayFlags) {
          return { noNetworkFeeChains: ['0x1'] };
        }
        if (selector === selectMoneyNoFeeTokens) {
          return {};
        }
        return undefined;
      });

      const { result } = renderHook(() => useMoneyDepositNoFee());
      expect(result.current).toBe(true);
    },
  );

  it('returns false when transaction is not a money account deposit or withdraw', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);

    const { result } = renderHook(() => useMoneyDepositNoFee());
    expect(result.current).toBe(false);
  });

  it('returns false when payToken is undefined', () => {
    mockUseTransactionPayToken.mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

    const { result } = renderHook(() => useMoneyDepositNoFee());
    expect(result.current).toBe(false);
  });

  it('returns false when chain and token are not in any no-fee list', () => {
    const { result } = renderHook(() => useMoneyDepositNoFee());
    expect(result.current).toBe(false);
  });

  it('returns true when pay token symbol + chainId is in noFeeTokens', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMetaMaskPayFlags) {
        return { noNetworkFeeChains: [] };
      }
      if (selector === selectMoneyNoFeeTokens) {
        return { '0x1': ['USDC'] };
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyDepositNoFee());
    expect(result.current).toBe(true);
  });

  it('returns true when pay token matches noFeeTokens wildcard chain', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMetaMaskPayFlags) {
        return { noNetworkFeeChains: [] };
      }
      if (selector === selectMoneyNoFeeTokens) {
        return { '*': ['USDC'] };
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyDepositNoFee());
    expect(result.current).toBe(true);
  });

  it('returns false when pay token symbol does not match noFeeTokens entry', () => {
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { ...PAY_TOKEN, symbol: 'DAI' },
      setPayToken: jest.fn(),
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMetaMaskPayFlags) {
        return { noNetworkFeeChains: [] };
      }
      if (selector === selectMoneyNoFeeTokens) {
        return { '0x1': ['USDC'] };
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyDepositNoFee());
    expect(result.current).toBe(false);
  });

  it('returns false when pay token chain does not match noFeeTokens entry', () => {
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { ...PAY_TOKEN, chainId: '0xa' as Hex },
      setPayToken: jest.fn(),
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMetaMaskPayFlags) {
        return { noNetworkFeeChains: [] };
      }
      if (selector === selectMoneyNoFeeTokens) {
        return { '0x1': ['USDC'] };
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyDepositNoFee());
    expect(result.current).toBe(false);
  });
});
