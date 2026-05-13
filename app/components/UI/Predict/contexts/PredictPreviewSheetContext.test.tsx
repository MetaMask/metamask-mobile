import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  getPredictLastBuyParams,
  isPredictBuySheetVisible,
  isPredictSheetProviderMounted,
  PredictPreviewSheetProvider,
  reopenPredictBuySheet,
  usePredictPreviewSheet,
} from './PredictPreviewSheetContext';
import type {
  PredictBuyPreviewParams,
  PredictSellPreviewParams,
} from '../types/navigation';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockTrackBetslipDismissed = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackBetslipDismissed: (...args: unknown[]) =>
        mockTrackBetslipDismissed(...args),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    addListener: jest.fn(() => jest.fn()),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
}));

let mockBottomSheetEnabled = true;
let mockPayWithAnyTokenEnabled = false;

const mockSelectPredictBottomSheetEnabledFlag = jest.fn();
const mockSelectPredictWithAnyTokenEnabledFlag = jest.fn();

jest.mock('../selectors/featureFlags', () => ({
  selectPredictBottomSheetEnabledFlag: (...args: unknown[]) =>
    mockSelectPredictBottomSheetEnabledFlag(...args),
  selectPredictWithAnyTokenEnabledFlag: (...args: unknown[]) =>
    mockSelectPredictWithAnyTokenEnabledFlag(...args),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector: (state: unknown) => unknown) => selector({})),
}));

const mockClearOrderError = jest.fn();
let mockActiveOrder: { error?: string; state?: string } | null = null;

jest.mock('../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: jest.fn(() => ({
    activeOrder: mockActiveOrder,
    clearOrderError: mockClearOrderError,
  })),
}));

jest.mock('../components/PredictPreviewSheet/PredictPreviewSheet', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const {
    View: RNView,
    Text: RNText,
    TouchableOpacity: RNTouchableOpacity,
  } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: forwardRef(
      (
        _props: {
          testID?: string;
          children?: (close: () => void) => React.ReactNode;
          renderHeader?: () => React.ReactNode;
          onDismiss?: () => void;
          title?: string;
          subtitle?: string;
          image?: string;
          isFullscreen?: boolean;
        },
        _ref: unknown,
      ) => {
        const closeSheet = () => _props.onDismiss?.();
        useImperativeHandle(_ref, () => ({
          onOpenBottomSheet: jest.fn(),
        }));
        return (
          <RNView testID={_props.testID ?? 'preview-sheet'}>
            {_props.title && (
              <RNText testID="sheet-title">{_props.title}</RNText>
            )}
            {_props.subtitle && (
              <RNText testID="sheet-subtitle">{_props.subtitle}</RNText>
            )}
            {_props.image && (
              <RNText testID="sheet-image">{_props.image}</RNText>
            )}
            {_props.renderHeader?.()}
            {_props.children?.(closeSheet)}
            <RNTouchableOpacity testID="dismiss-sheet" onPress={closeSheet}>
              <RNText>Dismiss</RNText>
            </RNTouchableOpacity>
          </RNView>
        );
      },
    ),
  };
});

jest.mock('../views/PredictBuyPreview/PredictBuyPreview', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <RNView testID="buy-preview" {...props} />
    ),
    predictBuyPreviewDismissedViaBackRef: { current: false },
    predictBuyPreviewOrderInitiatedRef: { current: false },
    predictBuyPreviewSessionRef: { mountTimestamp: 0, hadEnteredAmount: false },
  };
});

jest.mock('../views/PredictBuyWithAnyToken/PredictBuyWithAnyToken', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <RNView testID="buy-with-any-token" {...props} />
    ),
  };
});

jest.mock('../views/PredictSellPreview/PredictSellPreview', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <RNView testID="sell-preview" {...props} />
    ),
  };
});

const buyParams: PredictBuyPreviewParams = {
  market: { id: 'market-1' } as PredictBuyPreviewParams['market'],
  outcome: {
    id: 'outcome-1',
    title: 'Yes',
    image: 'https://img.png',
  } as PredictBuyPreviewParams['outcome'],
  outcomeToken: {
    id: 'token-1',
    title: 'Yes',
    price: 51,
  } as PredictBuyPreviewParams['outcomeToken'],
};

const sellParams: PredictSellPreviewParams = {
  market: { id: 'market-1' } as PredictSellPreviewParams['market'],
  position: {
    id: 'pos-1',
    title: 'Position',
    icon: 'https://icon.png',
    outcome: 'Yes',
    price: 51,
  } as PredictSellPreviewParams['position'],
  outcome: { id: 'outcome-1' } as PredictSellPreviewParams['outcome'],
};

const TestConsumer: React.FC = () => {
  const { openBuySheet, openSellSheet } = usePredictPreviewSheet();

  return (
    <View>
      <TouchableOpacity
        testID="open-buy"
        onPress={() => openBuySheet(buyParams)}
      >
        <Text>Open Buy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="open-sell"
        onPress={() => openSellSheet(sellParams)}
      >
        <Text>Open Sell</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('PredictPreviewSheetContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBottomSheetEnabled = true;
    mockPayWithAnyTokenEnabled = false;
    mockActiveOrder = null;
    mockSelectPredictBottomSheetEnabledFlag.mockImplementation(
      () => mockBottomSheetEnabled,
    );
    mockSelectPredictWithAnyTokenEnabledFlag.mockImplementation(
      () => mockPayWithAnyTokenEnabled,
    );
  });

  it('provides openBuySheet and openSellSheet to consumers', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    expect(screen.getByTestId('open-buy')).toBeOnTheScreen();
    expect(screen.getByTestId('open-sell')).toBeOnTheScreen();
  });

  it('renders buy preview sheet when openBuySheet is called and flag is ON', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders sell preview sheet when openSellSheet is called and flag is ON', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-sell'));

    expect(screen.getByTestId('predict-sell-preview-sheet')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to BUY_PREVIEW route when flag is OFF', () => {
    mockBottomSheetEnabled = false;

    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.MODALS.BUY_PREVIEW,
      buyParams,
    );
    expect(
      screen.queryByTestId('predict-buy-preview-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('navigates to SELL_PREVIEW route when flag is OFF', () => {
    mockBottomSheetEnabled = false;

    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-sell'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.MODALS.SELL_PREVIEW,
      sellParams,
    );
    expect(
      screen.queryByTestId('predict-sell-preview-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('falls back to navigation when used outside provider', () => {
    render(<TestConsumer />);

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
      params: buyParams,
    });
  });

  it('falls back to navigation for sell when used outside provider', () => {
    render(<TestConsumer />);

    fireEvent.press(screen.getByTestId('open-sell'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
      params: sellParams,
    });
  });

  it('renders PredictBuyWithAnyToken when payWithAnyToken flag is ON', () => {
    mockPayWithAnyTokenEnabled = true;

    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(screen.getByTestId('buy-with-any-token')).toBeOnTheScreen();
  });

  it('renders PredictBuyPreview when payWithAnyToken flag is OFF', () => {
    mockPayWithAnyTokenEnabled = false;

    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(screen.getByTestId('buy-preview')).toBeOnTheScreen();
  });

  it('clears buy params on dismiss', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));
    expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('dismiss-sheet'));
    expect(
      screen.queryByTestId('predict-buy-preview-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('clears sell params on dismiss', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-sell'));
    expect(screen.getByTestId('predict-sell-preview-sheet')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('dismiss-sheet'));
    expect(
      screen.queryByTestId('predict-sell-preview-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('passes title and subtitle to buy sheet', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(screen.getByTestId('sheet-title')).toBeOnTheScreen();
    expect(screen.getByTestId('sheet-subtitle')).toBeOnTheScreen();
  });

  it('passes image to buy sheet when outcome has image', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(screen.getByTestId('sheet-image')).toBeOnTheScreen();
  });

  it('renders SellSheetHeader with position info for sell sheet', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-sell'));

    expect(screen.getByTestId('sell-sheet-header-title')).toHaveTextContent(
      'Position',
    );
  });

  it('reopens buy sheet with same params via nonce increment', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));
    expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('dismiss-sheet'));
    expect(
      screen.queryByTestId('predict-buy-preview-sheet'),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('open-buy'));
    expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();
  });

  it('reopens sell sheet with same params via nonce increment', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-sell'));
    expect(screen.getByTestId('predict-sell-preview-sheet')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('dismiss-sheet'));
    expect(
      screen.queryByTestId('predict-sell-preview-sheet'),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('open-sell'));
    expect(screen.getByTestId('predict-sell-preview-sheet')).toBeOnTheScreen();
  });

  describe('reopen API for failure toast', () => {
    it('does not auto-reopen the buy sheet when activeOrder.error appears after dismiss', () => {
      const { rerender } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));
      expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('dismiss-sheet'));
      expect(
        screen.queryByTestId('predict-buy-preview-sheet'),
      ).not.toBeOnTheScreen();

      mockActiveOrder = { error: 'order/failed' };
      rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      // The sheet must NOT auto-reopen — the failure toast's "Try again"
      // action is now responsible for re-opening it.
      expect(
        screen.queryByTestId('predict-buy-preview-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('getPredictLastBuyParams returns the most recent params passed to openBuySheet', () => {
      expect(getPredictLastBuyParams()).toBeNull();

      render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));

      expect(getPredictLastBuyParams()).toEqual(buyParams);
    });

    it('isPredictBuySheetVisible reflects whether the buy sheet is on screen', () => {
      expect(isPredictBuySheetVisible()).toBe(false);

      render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(isPredictBuySheetVisible()).toBe(false);

      fireEvent.press(screen.getByTestId('open-buy'));
      expect(isPredictBuySheetVisible()).toBe(true);

      fireEvent.press(screen.getByTestId('dismiss-sheet'));
      expect(isPredictBuySheetVisible()).toBe(false);
    });

    it('reopenPredictBuySheet re-opens the buy sheet with the last params', () => {
      render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));
      fireEvent.press(screen.getByTestId('dismiss-sheet'));
      expect(
        screen.queryByTestId('predict-buy-preview-sheet'),
      ).not.toBeOnTheScreen();

      act(() => {
        reopenPredictBuySheet();
      });

      expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();
    });

    it('reopenPredictBuySheet is a no-op when no buy sheet has ever been opened', () => {
      render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      act(() => {
        reopenPredictBuySheet();
      });

      expect(
        screen.queryByTestId('predict-buy-preview-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('reopenPredictBuySheet is a no-op after the provider unmounts', () => {
      const { unmount } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));
      unmount();

      // After unmount, the module-level reopen handler is cleared so the call
      // is a no-op (and must not throw).
      expect(() => reopenPredictBuySheet()).not.toThrow();
    });
  });

  describe('isPredictSheetProviderMounted', () => {
    it('returns false when provider is not mounted', () => {
      expect(isPredictSheetProviderMounted()).toBe(false);
    });

    it('returns true while provider is mounted and false after unmount', () => {
      const { unmount } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(isPredictSheetProviderMounted()).toBe(true);

      unmount();

      expect(isPredictSheetProviderMounted()).toBe(false);
    });
  });

  describe('clearOrderError on dismiss', () => {
    it('calls clearOrderError when buy sheet is dismissed', () => {
      render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));
      fireEvent.press(screen.getByTestId('dismiss-sheet'));

      expect(mockClearOrderError).toHaveBeenCalledTimes(1);
    });

    it('does not call clearOrderError when sell sheet is dismissed', () => {
      render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-sell'));
      fireEvent.press(screen.getByTestId('dismiss-sheet'));

      expect(mockClearOrderError).not.toHaveBeenCalled();
    });
  });
});
