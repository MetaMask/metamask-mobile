import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useMoneyNoFeeTokens } from './useMoneyNoFeeTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { RelayFixedSpreadConfig } from '../../utils/relayFixedSpread';

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

const EMPTY_CONFIG: RelayFixedSpreadConfig = { routes: [] };

const configWithRoute = (
  sourceChain: string,
  sourceToken: string,
  targetChain = '0x279b',
  targetToken = '0xmusd',
): RelayFixedSpreadConfig => ({
  routes: [
    {
      sourceChain: sourceChain.toLowerCase() as Hex,
      sourceToken: sourceToken.toLowerCase() as Hex,
      targetChain: targetChain.toLowerCase() as Hex,
      targetToken: targetToken.toLowerCase() as Hex,
    },
  ],
});

describe('useMoneyNoFeeTokens', () => {
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
      if (selector === selectRelayFixedSpread) {
        return EMPTY_CONFIG;
      }
      return undefined;
    });
  });

  it('returns false when transaction is not a money account deposit or withdraw', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);

    const { result } = renderHook(() => useMoneyNoFeeTokens());
    expect(result.current).toEqual({ isMoneyNoFeeToken: false });
  });

  it('returns false when payToken is undefined', () => {
    mockUseTransactionPayToken.mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

    const { result } = renderHook(() => useMoneyNoFeeTokens());
    expect(result.current).toEqual({ isMoneyNoFeeToken: false });
  });

  it('returns false when no routes match the pay token', () => {
    const { result } = renderHook(() => useMoneyNoFeeTokens());
    expect(result.current).toEqual({ isMoneyNoFeeToken: false });
  });

  it('returns true when pay token matches a subsidized source route', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRelayFixedSpread) {
        return configWithRoute('0x1', '0xabc');
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyNoFeeTokens());
    expect(result.current).toEqual({ isMoneyNoFeeToken: true });
  });

  it('returns true with case-insensitive address matching', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRelayFixedSpread) {
        return configWithRoute('0x1', '0xABC');
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyNoFeeTokens());
    expect(result.current).toEqual({ isMoneyNoFeeToken: true });
  });

  it('returns false when pay token address does not match any route', () => {
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { ...PAY_TOKEN, address: '0xdef' as Hex },
      setPayToken: jest.fn(),
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRelayFixedSpread) {
        return configWithRoute('0x1', '0xabc');
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyNoFeeTokens());
    expect(result.current).toEqual({ isMoneyNoFeeToken: false });
  });

  it('returns false when pay token chain does not match any route', () => {
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { ...PAY_TOKEN, chainId: '0xa' as Hex },
      setPayToken: jest.fn(),
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRelayFixedSpread) {
        return configWithRoute('0x1', '0xabc');
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyNoFeeTokens());
    expect(result.current).toEqual({ isMoneyNoFeeToken: false });
  });
});
