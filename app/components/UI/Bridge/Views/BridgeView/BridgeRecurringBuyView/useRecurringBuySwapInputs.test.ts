import { renderHook } from '@testing-library/react-native';
import type { CaipChainId } from '@metamask/utils';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
  setDestToken,
  setSourceAmount,
  setSourceToken,
} from '../../../../../../core/redux/slices/bridge';
import { selectBridgeRecurringBuyFeatureFlags } from '../../../../../../selectors/bridge/featureFlags';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../../selectors/featureFlagController/gasFeesSponsored';
import { getNativeSourceToken } from '../../../utils/tokenUtils';
import { createMockToken } from '../../../testUtils/fixtures';
import { TokenSelectorType, type BridgeToken } from '../../../types';
import Routes from '../../../../../../constants/navigation/Routes';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: () => ({
    destTokenAmount: undefined,
    isLoading: false,
  }),
}));

const mockUpdateQuoteParams = Object.assign(jest.fn(), { cancel: jest.fn() });
const mockUseBridgeQuoteRequest = jest.fn(() => mockUpdateQuoteParams);
jest.mock('../../../hooks/useBridgeQuoteRequest', () => ({
  useBridgeQuoteRequest: (options?: unknown) =>
    mockUseBridgeQuoteRequest(options),
}));

jest.mock('../../../hooks/useIsNetworkEnabled', () => ({
  useIsNetworkEnabled: () => true,
}));

let mockIsHardwareWallet = false;
jest.mock('../../../hooks/useIsHardwareWalletForBridge', () => ({
  useIsHardwareWalletForBridge: () => mockIsHardwareWallet,
}));

const mockSyncFiatAmountToTokenAmount = jest.fn();
jest.mock('../../../hooks/useSourceAmountInput', () => ({
  useSourceAmountInput: () => ({
    amount: '',
    selection: undefined,
    handleFocus: jest.fn(),
    handleSelectionChange: jest.fn(),
    canToggle: false,
    handleToggle: jest.fn(),
    inputPrefix: undefined,
    secondaryValue: undefined,
    balanceCheckAmount: undefined,
    keypadValue: '',
    keypadCurrency: undefined,
    keypadDecimals: 18,
    handleKeypadChange: jest.fn(),
    resetToTokenMode: jest.fn(),
    syncFiatAmountToTokenAmount: mockSyncFiatAmountToTokenAmount,
    isFiatMode: false,
  }),
}));

jest.mock('../../../hooks/useSwitchTokens', () => ({
  useSwitchTokens: () => ({ handleSwitchTokens: jest.fn(() => jest.fn()) }),
}));

import { useSelector } from 'react-redux';
const mockUseSelector = useSelector as jest.Mock;

const ENABLED_CHAIN_IDS: CaipChainId[] = [
  'eip155:1',
  'eip155:56',
  'eip155:8453',
];

interface SelectorState {
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
  sourceAmount: string | undefined;
}

const renderRecurringBuySwapInputsHook = (
  selectorState: SelectorState,
  enabledChainIds: CaipChainId[] | undefined,
  gasSponsoredChainIds: string[] = [],
) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectSourceToken) {
      return selectorState.sourceToken;
    }
    if (selector === selectDestToken) {
      return selectorState.destToken;
    }
    if (selector === selectSourceAmount) {
      return selectorState.sourceAmount;
    }
    if (selector === selectBridgeRecurringBuyFeatureFlags) {
      return enabledChainIds ? { enabled: true, enabledChainIds } : undefined;
    }
    if (selector === getGasFeesSponsoredNetworkEnabled) {
      return (chainId: string) => gasSponsoredChainIds.includes(chainId);
    }
    return undefined;
  });

  return renderHook(() =>
    useRecurringBuySwapInputs({ latestSourceBalance: undefined }),
  );
};

describe('useRecurringBuySwapInputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsHardwareWallet = false;
  });

  it('always resets source/dest to ETH/mUSD on mount when Ethereum is enabled', () => {
    // Simulates a token selected on another tab (e.g. Market order) whose
    // chain isn't part of this flow's allowed chains. The view mounting fresh
    // (tab switch) is what triggers the reset.
    const staleSourceToken = createMockToken({
      chainId: '0xa4b1', // Arbitrum, not in ENABLED_CHAIN_IDS
      symbol: 'ARB-TOKEN',
    });
    const staleDestToken = createMockToken({
      chainId: '0xa4b1',
      symbol: 'ARB-DEST',
      address: '0xdest',
    });

    renderRecurringBuySwapInputsHook(
      {
        sourceToken: staleSourceToken,
        destToken: staleDestToken,
        sourceAmount: undefined,
      },
      ENABLED_CHAIN_IDS,
    );

    const expectedDefaultSourceToken = getNativeSourceToken('eip155:1');
    expect(mockDispatch).toHaveBeenCalledWith(
      setSourceToken(expectedDefaultSourceToken),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setDestToken(expect.objectContaining({ symbol: 'mUSD' })),
    );
  });

  it('falls back to the first enabled chain default pair when Ethereum is not enabled', () => {
    const staleSourceToken = createMockToken({ chainId: '0xa4b1' });

    renderRecurringBuySwapInputsHook(
      {
        sourceToken: staleSourceToken,
        destToken: undefined,
        sourceAmount: undefined,
      },
      ['eip155:56', 'eip155:8453'],
    );

    const expectedDefaultSourceToken = getNativeSourceToken('eip155:56');
    expect(mockDispatch).toHaveBeenCalledWith(
      setSourceToken(expectedDefaultSourceToken),
    );
  });

  it('resets to the default pair even when the current selection is already within the enabled chains', () => {
    // Intentional: the reset always fires on mount (tab entry), so the
    // picker starts from a predictable default every time rather than
    // depending on whatever was left selected from a prior visit.
    const validSourceToken = getNativeSourceToken('eip155:1');

    renderRecurringBuySwapInputsHook(
      {
        sourceToken: validSourceToken,
        destToken: undefined,
        sourceAmount: undefined,
      },
      ENABLED_CHAIN_IDS,
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      setSourceToken(getNativeSourceToken('eip155:1')),
    );
  });

  describe('handleSourcePresetAmountSelect', () => {
    it('sets the source amount to the preset value and keeps the fiat amount in sync', () => {
      const { result } = renderRecurringBuySwapInputsHook(
        {
          sourceToken: getNativeSourceToken('eip155:1'),
          destToken: undefined,
          sourceAmount: undefined,
        },
        ENABLED_CHAIN_IDS,
      );

      result.current.handleSourcePresetAmountSelect('1.500');

      expect(mockSyncFiatAmountToTokenAmount).toHaveBeenCalledWith('1.5');
      expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount('1.5'));
    });

    it('clears the source amount when the preset normalizes to an empty value', () => {
      const { result } = renderRecurringBuySwapInputsHook(
        {
          sourceToken: getNativeSourceToken('eip155:1'),
          destToken: undefined,
          sourceAmount: '1',
        },
        ENABLED_CHAIN_IDS,
      );

      result.current.handleSourcePresetAmountSelect('');

      expect(mockSyncFiatAmountToTokenAmount).toHaveBeenCalledWith(undefined);
      expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount(undefined));
    });
  });

  describe('isQuoteSponsored', () => {
    it('is true when both tokens are on the same gas-sponsored chain', () => {
      const sourceToken = createMockToken({ chainId: '0x279f' });
      const destToken = createMockToken({
        chainId: '0x279f',
        address: '0xdest',
      });

      const { result } = renderRecurringBuySwapInputsHook(
        { sourceToken, destToken, sourceAmount: undefined },
        ENABLED_CHAIN_IDS,
        ['0x279f'],
      );

      expect(result.current.isQuoteSponsored).toBe(true);
    });

    it('is false when the tokens are on different chains', () => {
      const sourceToken = createMockToken({ chainId: '0x279f' });
      const destToken = createMockToken({
        chainId: '0x1',
        address: '0xdest',
      });

      const { result } = renderRecurringBuySwapInputsHook(
        { sourceToken, destToken, sourceAmount: undefined },
        ENABLED_CHAIN_IDS,
        ['0x279f', '0x1'],
      );

      expect(result.current.isQuoteSponsored).toBe(false);
    });

    it('is false when the shared chain is not gas sponsored', () => {
      const sourceToken = createMockToken({ chainId: '0x1' });
      const destToken = createMockToken({ chainId: '0x1', address: '0xdest' });

      const { result } = renderRecurringBuySwapInputsHook(
        { sourceToken, destToken, sourceAmount: undefined },
        ENABLED_CHAIN_IDS,
        [],
      );

      expect(result.current.isQuoteSponsored).toBe(false);
    });
  });

  describe('quote requests', () => {
    const validInputs = {
      sourceToken: getNativeSourceToken('eip155:1'),
      destToken: createMockToken({ address: '0xdest', symbol: 'mUSD' }),
      sourceAmount: '1',
    };

    it('requests a quote once the inputs are complete', () => {
      renderRecurringBuySwapInputsHook(validInputs, ENABLED_CHAIN_IDS);

      expect(mockUpdateQuoteParams).toHaveBeenCalled();
    });

    it('never requests a quote for a hardware wallet account', () => {
      mockIsHardwareWallet = true;

      renderRecurringBuySwapInputsHook(validInputs, ENABLED_CHAIN_IDS);

      expect(mockUpdateQuoteParams).not.toHaveBeenCalled();
    });
  });

  describe('token selector navigation', () => {
    it('opens the source picker scoped to the enabled chains and without RWAs', () => {
      const { result } = renderRecurringBuySwapInputsHook(
        {
          sourceToken: getNativeSourceToken('eip155:1'),
          destToken: undefined,
          sourceAmount: undefined,
        },
        ENABLED_CHAIN_IDS,
      );

      result.current.handleSourceTokenPress();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BRIDGE.TOKEN_SELECTOR,
        expect.objectContaining({
          type: TokenSelectorType.Source,
          enabledChainIds: ENABLED_CHAIN_IDS,
          excludeRwaTokens: true,
        }),
      );
    });

    it('opens the destination picker scoped to the enabled chains and without RWAs', () => {
      const { result } = renderRecurringBuySwapInputsHook(
        {
          sourceToken: getNativeSourceToken('eip155:1'),
          destToken: undefined,
          sourceAmount: undefined,
        },
        ENABLED_CHAIN_IDS,
      );

      result.current.handleDestTokenPress();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BRIDGE.TOKEN_SELECTOR,
        expect.objectContaining({
          type: TokenSelectorType.Dest,
          enabledChainIds: ENABLED_CHAIN_IDS,
          excludeRwaTokens: true,
        }),
      );
    });
  });

  it('does not reset tokens when the recurring buy feature flag is missing', () => {
    const staleSourceToken = createMockToken({ chainId: '0xa4b1' });

    renderRecurringBuySwapInputsHook(
      {
        sourceToken: staleSourceToken,
        destToken: undefined,
        sourceAmount: undefined,
      },
      undefined,
    );

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setSourceToken(expect.anything()),
    );
  });

  it('requests quotes without a Recurring slippage override', () => {
    const sourceToken = getNativeSourceToken('eip155:1');
    const destToken = createMockToken({
      chainId: '0x1',
      symbol: 'USDC',
      address: '0xdest',
    });

    renderRecurringBuySwapInputsHook(
      {
        sourceToken,
        destToken,
        sourceAmount: '1',
      },
      ENABLED_CHAIN_IDS,
    );

    expect(mockUseBridgeQuoteRequest).toHaveBeenCalledWith({
      latestSourceAtomicBalance: undefined,
    });
  });
});
