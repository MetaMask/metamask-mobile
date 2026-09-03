import { renderHook } from '@testing-library/react-native';
import type { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';

import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import {
  selectConversionRateByChainId,
  selectUSDConversionRateByChainId,
} from '../../../../../selectors/currencyRateController';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import useHideFiatForTestnet from '../../../../hooks/useHideFiatForTestnet';
import { TOKEN_VALUE_UNLIMITED_THRESHOLD } from '../../constants/approve';
import { ApproveMethod } from '../../types/approve';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useApproveTransactionData } from '../useApproveTransactionData';
import { useApprovedAmountFiat } from './useApprovedAmountFiat';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../selectors/tokenRatesController', () => ({
  selectContractExchangeRatesByChainId: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectConversionRateByChainId: jest.fn(),
  selectUSDConversionRateByChainId: jest.fn(),
}));

jest.mock('../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');
jest.mock('../../../../hooks/useHideFiatForTestnet');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useApproveTransactionData');

const CHAIN_ID = '0x1' as Hex;
const TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const mockSelectContractExchangeRatesByChainId = jest.mocked(
  selectContractExchangeRatesByChainId,
);
const mockSelectConversionRateByChainId = jest.mocked(
  selectConversionRateByChainId,
);
const mockSelectUSDConversionRateByChainId = jest.mocked(
  selectUSDConversionRateByChainId,
);
const mockUseFiatFormatter = jest.mocked(useFiatFormatter);
const mockUseHideFiatForTestnet = jest.mocked(useHideFiatForTestnet);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockUseApproveTransactionData = jest.mocked(useApproveTransactionData);

function mockApproveData(overrides: Record<string, unknown> = {}): void {
  mockUseApproveTransactionData.mockReturnValue({
    approveMethod: ApproveMethod.APPROVE,
    isLoading: false,
    isRevoke: false,
    rawAmount: '5000',
    tokenBalance: '50',
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('useApprovedAmountFiat', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockUseHideFiatForTestnet.mockReturnValue(false);
    mockUseFiatFormatter.mockReturnValue(
      (fiatAmount: BigNumber) => `$${fiatAmount.toFixed(2)}`,
    );
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: CHAIN_ID,
      txParams: { to: TOKEN_ADDRESS },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockApproveData();
    mockSelectContractExchangeRatesByChainId.mockReturnValue({
      [TOKEN_ADDRESS]: { price: 0.0005 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockSelectConversionRateByChainId.mockReturnValue(2000);
    mockSelectUSDConversionRateByChainId.mockReturnValue(2000);
  });

  it('returns the fiat value of the full spending cap', () => {
    const { result } = renderHook(() => useApprovedAmountFiat());

    // 5000 tokens * 0.0005 ETH * $2000/ETH = $5000
    expect(result.current).toBe('$5000.00');
  });

  it('does not cap the amount to the user token balance', () => {
    mockApproveData({ rawAmount: '5000', tokenBalance: '50' });

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBe('$5000.00');
  });

  it('uses the Permit2 token address rather than the Permit2 contract', () => {
    const permit2Token = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    mockApproveData({
      approveMethod: ApproveMethod.PERMIT2_APPROVE,
      token: permit2Token,
    });
    mockSelectContractExchangeRatesByChainId.mockReturnValue({
      [permit2Token]: { price: 0.0005 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBe('$5000.00');
  });

  it('returns null while approval data is loading', () => {
    mockApproveData({ isLoading: true });

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null for a revoke', () => {
    mockApproveData({ isRevoke: true, rawAmount: '0' });

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null for decreaseAllowance', () => {
    mockApproveData({ approveMethod: ApproveMethod.DECREASE_ALLOWANCE });

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null for setApprovalForAll', () => {
    mockApproveData({
      approveMethod: ApproveMethod.SET_APPROVAL_FOR_ALL,
      rawAmount: undefined,
    });

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null for an unlimited spending cap', () => {
    mockApproveData({
      rawAmount: String(TOKEN_VALUE_UNLIMITED_THRESHOLD + 1),
    });

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null when fiat is hidden on testnets', () => {
    mockUseHideFiatForTestnet.mockReturnValue(true);

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null when there is no transaction metadata', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null when the token price is unavailable', () => {
    mockSelectContractExchangeRatesByChainId.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });

  it('returns null when the USD conversion is unavailable', () => {
    mockSelectUSDConversionRateByChainId.mockReturnValue(undefined);

    const { result } = renderHook(() => useApprovedAmountFiat());

    expect(result.current).toBeNull();
  });
});
