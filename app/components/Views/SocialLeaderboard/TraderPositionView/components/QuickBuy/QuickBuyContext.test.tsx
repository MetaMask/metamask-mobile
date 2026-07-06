import { TextColor } from '@metamask/design-system-react-native';
import { act, render } from '@testing-library/react-native';
import React, { useContext } from 'react';
import {
  QuickBuyContext,
  QuickBuyProvider,
  type QuickBuyContextValue,
} from './QuickBuyContext';
import {
  useQuickBuyController,
  type UseQuickBuyControllerResult,
} from './hooks/useQuickBuyController';
import type { QuickBuyFeatures, QuickBuyTarget } from './types';

jest.mock('./hooks/useQuickBuyController', () => ({
  useQuickBuyController: jest.fn(),
}));

const mockTarget: QuickBuyTarget = {
  tokenAddress: '0x1234567890123456789012345678901234567890',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  chain: 'eip155:8453',
};

const featuresWithModal: QuickBuyFeatures = {
  tradeModes: ['buy'],
  quoteDetails: false,
  selectQuote: false,
  payWithSheet: true,
  highPriceImpactModal: true,
  fiatCryptoToggle: true,
};

const featuresWithoutModal: QuickBuyFeatures = {
  ...featuresWithModal,
  highPriceImpactModal: false,
};

const buildController = (
  overrides: Partial<UseQuickBuyControllerResult> = {},
): UseQuickBuyControllerResult => ({
  hiddenInputRef: { current: null } as never,
  activeQuote: undefined,
  destToken: undefined,
  isSetupLoading: false,
  isUnsupportedChain: false,
  sourceToken: undefined,
  sourceChainId: '0x1',
  sourceTokenOptions: [],
  selectedSourceToken: undefined,
  isSourcePickerOpen: false,
  setIsSourcePickerOpen: jest.fn(),
  setSelectedSourceToken: jest.fn(),
  currentCurrency: 'USD',
  amountDisplayMode: 'fiat',
  fiatAmount: '',
  fiatAmountLabel: '$0.00',
  sliderPercent: 0,
  maxSpendFiat: 0,
  formattedExchangeRate: undefined,
  metamaskFeePercent: 0,
  estimatedReceiveAmount: undefined,
  sourceBalanceFiat: '$0.00',
  sourceBalanceDisplay: undefined,
  destBalanceFiat: undefined,
  formattedNetworkFee: '-',
  formattedSlippage: '-',
  formattedMinimumReceived: '-',
  formattedMinimumReceivedFiat: undefined,
  formattedPriceImpact: '-',
  formattedRate: undefined,
  totalAmountFiat: '$0',
  isQuoteLoading: false,
  isBlockingQuoteLoad: false,
  isSubmittingTx: false,
  isTotalLoading: false,
  sortedQuotes: [],
  selectedQuoteRequestId: undefined,
  setSelectedQuoteRequestId: jest.fn(),
  handleSelectQuote: jest.fn(),
  quotesLastFetchedAt: null,
  refreshCount: 0,
  quoteRefreshRateMs: 30000,
  maxRefreshCount: 5,
  refetchQuotes: jest.fn(),
  isHardwareSolanaBlocked: false,
  priceImpactViewData: {
    textColor: TextColor.TextAlternative,
    icon: undefined,
    title: 'bridge.price_impact_info_title',
    description: 'bridge.price_impact_info_description',
  },
  isPriceImpactError: false,
  buttonError: null,
  hasValidAmount: false,
  isConfirmDisabled: false,
  confirmButtonState: 'idle',
  getButtonLabel: () => 'Buy',
  handleClose: jest.fn(),
  handleSliderChange: jest.fn(),
  handleSliderDragEnd: jest.fn(),
  handleAmountAreaPress: jest.fn(),
  handleAmountChange: jest.fn(),
  handleToggleAmountDisplay: jest.fn(),
  handleSelectSourceToken: jest.fn(),
  tradeMode: 'buy' as const,
  setTradeMode: jest.fn(),
  hasSellableBalance: false,
  sourceAmountTokens: '',
  sourceTokenAmount: undefined,
  hasSourcePrice: true,
  isSliderDisabled: false,
  sellDestTokenOptions: [],
  selectedDestStable: undefined,
  handleSelectDestStable: jest.fn(),
  handleConfirm: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

/**
 * Renders a QuickBuyProvider and exposes the context value via a ref so tests
 * can inspect or invoke context methods directly.
 */
function renderProvider(
  features: QuickBuyFeatures,
  setActiveScreen: jest.Mock = jest.fn(),
) {
  const contextRef: { current: QuickBuyContextValue } = {
    current: null as never,
  };

  const Consumer = () => {
    contextRef.current = useContext(QuickBuyContext) as never;
    return null;
  };

  render(
    <QuickBuyProvider
      target={mockTarget}
      onClose={jest.fn()}
      features={features}
      activeScreen="amount"
      setActiveScreen={setActiveScreen}
    >
      <Consumer />
    </QuickBuyProvider>,
  );

  return contextRef;
}

describe('QuickBuyProvider — handleBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls handleConfirm directly when there is no price impact error', async () => {
    const handleConfirm = jest.fn().mockResolvedValue(undefined);
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildController({ isPriceImpactError: false, handleConfirm }),
    );

    const setActiveScreen = jest.fn();
    const ctx = renderProvider(featuresWithModal, setActiveScreen);

    await act(async () => {
      await ctx.current.handleBuy();
    });

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(setActiveScreen).not.toHaveBeenCalled();
  });

  it('navigates to priceImpactConfirm when isPriceImpactError=true and highPriceImpactModal=true', async () => {
    const handleConfirm = jest.fn();
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildController({ isPriceImpactError: true, handleConfirm }),
    );

    const setActiveScreen = jest.fn();
    const ctx = renderProvider(featuresWithModal, setActiveScreen);

    await act(async () => {
      await ctx.current.handleBuy();
    });

    expect(setActiveScreen).toHaveBeenCalledWith('priceImpactConfirm');
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('does not navigate and does not confirm when isPriceImpactError=true and highPriceImpactModal=false', async () => {
    const handleConfirm = jest.fn();
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildController({ isPriceImpactError: true, handleConfirm }),
    );

    const setActiveScreen = jest.fn();
    const ctx = renderProvider(featuresWithoutModal, setActiveScreen);

    await act(async () => {
      await ctx.current.handleBuy();
    });

    expect(setActiveScreen).not.toHaveBeenCalled();
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});

describe('QuickBuyProvider — isConfirmDisabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is false when controller says false and there is no price impact error', () => {
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildController({ isConfirmDisabled: false, isPriceImpactError: false }),
    );

    const ctx = renderProvider(featuresWithModal);
    expect(ctx.current.isConfirmDisabled).toBe(false);
  });

  it('is true when isPriceImpactError=true and highPriceImpactModal=false', () => {
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildController({ isConfirmDisabled: false, isPriceImpactError: true }),
    );

    const ctx = renderProvider(featuresWithoutModal);
    expect(ctx.current.isConfirmDisabled).toBe(true);
  });

  it('is false (modal handles it) when isPriceImpactError=true and highPriceImpactModal=true', () => {
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildController({ isConfirmDisabled: false, isPriceImpactError: true }),
    );

    const ctx = renderProvider(featuresWithModal);
    expect(ctx.current.isConfirmDisabled).toBe(false);
  });

  it('respects the controller isConfirmDisabled flag independently', () => {
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildController({ isConfirmDisabled: true, isPriceImpactError: false }),
    );

    const ctx = renderProvider(featuresWithModal);
    expect(ctx.current.isConfirmDisabled).toBe(true);
  });
});
