import { renderHook, act } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdBalance } from '../../Earn/hooks/useMusdBalance';
import { useMusdConversionFlowData } from '../../Earn/hooks/useMusdConversionFlowData';
import { useRampNavigation } from '../../Ramp/hooks/useRampNavigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../Earn/constants/musd';
import { useMoneyAccountAddRouting } from './useMoneyAccountAddRouting';

jest.mock('../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

jest.mock('../../Earn/hooks/useMusdConversionFlowData', () => ({
  useMusdConversionFlowData: jest.fn(),
}));

jest.mock('../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('./useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

const mockedUseMusdBalance = useMusdBalance as jest.Mock;
const mockedUseMusdConversionFlowData = useMusdConversionFlowData as jest.Mock;
const mockedUseRampNavigation = useRampNavigation as jest.Mock;
const mockedUseMoneyAccountDeposit = useMoneyAccountDeposit as jest.Mock;

const mockInitiateDeposit = jest.fn(() => Promise.resolve());
const mockGoToBuy = jest.fn();
const mockGetChainIdForBuyFlow = jest.fn();

const setupMocks = (overrides?: {
  hasMusdBalanceOnAnyChain?: boolean;
  fiatBalanceAggregated?: string;
  tokenBalanceByChain?: Record<string, string> | undefined;
  getChainIdForBuyFlow?: jest.Mock | undefined;
}) => {
  mockedUseMusdBalance.mockReturnValue({
    hasMusdBalanceOnAnyChain: overrides?.hasMusdBalanceOnAnyChain ?? false,
    fiatBalanceAggregated: overrides?.fiatBalanceAggregated,
    tokenBalanceByChain: overrides?.tokenBalanceByChain,
  });
  mockedUseMusdConversionFlowData.mockReturnValue({
    getChainIdForBuyFlow:
      overrides && 'getChainIdForBuyFlow' in overrides
        ? overrides.getChainIdForBuyFlow
        : mockGetChainIdForBuyFlow,
  });
  mockedUseRampNavigation.mockReturnValue({
    goToBuy: mockGoToBuy,
  });
  mockedUseMoneyAccountDeposit.mockReturnValue({
    initiateDeposit: mockInitiateDeposit,
  });
};

describe('useMoneyAccountAddRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChainIdForBuyFlow.mockReturnValue(MUSD_CONVERSION_DEFAULT_CHAIN_ID);
  });

  describe('hasMusdBalance', () => {
    it('is true when hasMusdBalanceOnAnyChain is true', () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: true,
        fiatBalanceAggregated: undefined,
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      expect(result.current.hasMusdBalance).toBe(true);
    });

    it('is true when the parsed fiat balance is positive', () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: false,
        fiatBalanceAggregated: '12.34',
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      expect(result.current.hasMusdBalance).toBe(true);
    });

    it('is false when there is no chain balance and the parsed fiat balance is zero', () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: false,
        fiatBalanceAggregated: '0',
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      expect(result.current.hasMusdBalance).toBe(false);
    });

    it('is false when the fiat balance is undefined and no on-chain balance', () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: false,
        fiatBalanceAggregated: undefined,
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      expect(result.current.hasMusdBalance).toBe(false);
    });
  });

  describe('convertCrypto', () => {
    it('calls initiateDeposit with no options', async () => {
      setupMocks();

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await act(async () => {
        await result.current.convertCrypto();
      });

      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
      expect(mockInitiateDeposit).toHaveBeenCalledWith();
    });

    it('swallows initiateDeposit failures', async () => {
      setupMocks();
      mockInitiateDeposit.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await expect(result.current.convertCrypto()).resolves.toBeUndefined();
    });
  });

  describe('depositFunds', () => {
    it('routes to the Buy flow with the mUSD asset id for the chain returned by getChainIdForBuyFlow', () => {
      mockGetChainIdForBuyFlow.mockReturnValue(CHAIN_IDS.LINEA_MAINNET);
      setupMocks();

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      act(() => {
        result.current.depositFunds();
      });

      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
      });
    });

    it('falls back to MUSD_CONVERSION_DEFAULT_CHAIN_ID when getChainIdForBuyFlow is not provided', () => {
      setupMocks({ getChainIdForBuyFlow: undefined });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      act(() => {
        result.current.depositFunds();
      });

      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      });
    });

    it('falls back to the default chain mUSD asset id when the resolved chain has no mapped asset id', () => {
      mockGetChainIdForBuyFlow.mockReturnValue(CHAIN_IDS.ARBITRUM);
      setupMocks();

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      act(() => {
        result.current.depositFunds();
      });

      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      });
    });
  });

  describe('moveMusd', () => {
    it('picks the chain with the highest mUSD balance', async () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: true,
        tokenBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '500.00',
          [CHAIN_IDS.LINEA_MAINNET]: '1000.00',
        },
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await act(async () => {
        await result.current.moveMusd();
      });

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        intent: 'addMusd',
        preferredPaymentToken: {
          address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
          chainId: CHAIN_IDS.LINEA_MAINNET,
        },
      });
    });

    it('falls back to the default chain when no per-chain balances are available', async () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: true,
        tokenBalanceByChain: undefined,
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await act(async () => {
        await result.current.moveMusd();
      });

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        intent: 'addMusd',
        preferredPaymentToken: {
          address:
            MUSD_TOKEN_ADDRESS_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
          chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        },
      });
    });

    it('swallows initiateDeposit failures', async () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: true,
        tokenBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '1.00',
        },
      });
      mockInitiateDeposit.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await expect(result.current.moveMusd()).resolves.toBeUndefined();
    });
  });

  describe('routeAddMoney', () => {
    it('delegates to moveMusd when hasMusdBalance is true', async () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: true,
        tokenBalanceByChain: {
          [CHAIN_IDS.MAINNET]: '100.00',
        },
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await act(async () => {
        await result.current.routeAddMoney();
      });

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        intent: 'addMusd',
        preferredPaymentToken: {
          address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET],
          chainId: CHAIN_IDS.MAINNET,
        },
      });
      expect(mockGoToBuy).not.toHaveBeenCalled();
    });

    it('delegates to moveMusd when only the parsed fiat balance is positive', async () => {
      setupMocks({
        hasMusdBalanceOnAnyChain: false,
        fiatBalanceAggregated: '5.00',
        tokenBalanceByChain: undefined,
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      await act(async () => {
        await result.current.routeAddMoney();
      });

      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        intent: 'addMusd',
        preferredPaymentToken: {
          address:
            MUSD_TOKEN_ADDRESS_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
          chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        },
      });
      expect(mockGoToBuy).not.toHaveBeenCalled();
    });

    it('delegates to depositFunds when there is no mUSD balance', () => {
      mockGetChainIdForBuyFlow.mockReturnValue(CHAIN_IDS.MAINNET);
      setupMocks({
        hasMusdBalanceOnAnyChain: false,
        fiatBalanceAggregated: '0',
        tokenBalanceByChain: {},
      });

      const { result } = renderHook(() => useMoneyAccountAddRouting());

      act(() => {
        result.current.routeAddMoney();
      });

      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MAINNET],
      });
      expect(mockInitiateDeposit).not.toHaveBeenCalled();
    });
  });
});
