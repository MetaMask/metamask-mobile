import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { TEST_HEX_COLORS as mockTestHexColors } from '../testUtils/mockColors';
import {
  shouldSuppressLegacyOrderFailureToast,
  PredictPreviewSheetProvider,
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

const mockToastShowToast = jest.fn();
const mockToastCloseToast = jest.fn();
jest.mock('../../../../core/ToastService', () => ({
  __esModule: true,
  default: {
    showToast: (...args: unknown[]) => mockToastShowToast(...args),
    closeToast: (...args: unknown[]) => mockToastCloseToast(...args),
  },
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      accent04: { normal: mockTestHexColors.WHITE_BRIGHT },
      error: {
        default: mockTestHexColors.WHITE_BRIGHT,
        muted: mockTestHexColors.WHITE_BRIGHT,
      },
    },
  }),
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
  const { openBuySheet, openSellSheet, isBuySheetOpen } =
    usePredictPreviewSheet();

  return (
    <View>
      <Text testID="buy-sheet-open">{String(isBuySheetOpen)}</Text>
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
    // Explicit toast/clearOrderError mock resets — `jest.clearAllMocks()`
    // covers them but reset them by name for clarity and resilience to
    // any future module-scope mock that doesn't get auto-cleared.
    mockToastShowToast.mockReset();
    mockToastCloseToast.mockReset();
    mockClearOrderError.mockReset();
    mockTrackBetslipDismissed.mockReset();
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

  it('exposes buy sheet open state while sheet is mounted', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    expect(screen.getByTestId('buy-sheet-open')).toHaveTextContent('false');

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(screen.getByTestId('buy-sheet-open')).toHaveTextContent('true');

    fireEvent.press(screen.getByTestId('dismiss-sheet'));

    expect(screen.getByTestId('buy-sheet-open')).toHaveTextContent('false');
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
      params: buyParams,
    });
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
      params: sellParams,
    });
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

  describe('failure toast (state-based trigger)', () => {
    it('does not auto-reopen the buy sheet when activeOrder.error appears after dismiss, and fires a Try again toast instead', () => {
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

      // The sheet must NOT auto-reopen.
      expect(
        screen.queryByTestId('predict-buy-preview-sheet'),
      ).not.toBeOnTheScreen();

      // Instead, ToastService.showToast is called with a non-persistent
      // toast that auto-dismisses. The Retry uses `closeButtonOptions`
      // (with `ButtonVariants.Link`) so it sits inline on the right of
      // the row, matching the deposit/Track toast convention. The
      // description line keeps the labels container two lines tall so
      // the row's flex-start alignment looks balanced against the
      // taller Primary Retry button.
      expect(mockToastShowToast).toHaveBeenCalledTimes(1);
      const toastCall = mockToastShowToast.mock.calls[0][0];
      expect(toastCall.hasNoTimeout).toBe(false);
      expect(toastCall.linkButtonOptions).toBeUndefined();
      expect(toastCall.descriptionOptions).toEqual(
        expect.objectContaining({ description: expect.any(String) }),
      );
      expect(toastCall.closeButtonOptions).toEqual(
        expect.objectContaining({
          label: expect.any(String),
          variant: 'Link',
        }),
      );
      expect(typeof toastCall.closeButtonOptions.onPress).toBe('function');

      // Tapping Retry reopens the slip with the last params. The toast
      // is left to animate out on its own (no explicit closeToast call).
      act(() => {
        toastCall.closeButtonOptions.onPress();
      });
      expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();
      expect(mockToastCloseToast).not.toHaveBeenCalled();
    });

    it('does not fire the toast when the slip is open (banner handles it)', () => {
      const { rerender } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));
      expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();

      mockActiveOrder = { error: 'order/failed' };
      rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(mockToastShowToast).not.toHaveBeenCalled();
    });

    it('does not fire the toast when bottomSheetEnabled is OFF (legacy flow)', () => {
      mockBottomSheetEnabled = false;
      const { rerender } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));

      mockActiveOrder = { error: 'order/failed' };
      rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(mockToastShowToast).not.toHaveBeenCalled();
    });

    it('does not fire the toast on error transitions when no buy sheet was ever opened', () => {
      const { rerender } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      mockActiveOrder = { error: 'order/failed' };
      rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(mockToastShowToast).not.toHaveBeenCalled();
    });

    it('only fires once per error transition (does not re-fire on unrelated rerenders)', () => {
      const { rerender } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));
      fireEvent.press(screen.getByTestId('dismiss-sheet'));

      mockActiveOrder = { error: 'order/failed' };
      rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      expect(mockToastShowToast).toHaveBeenCalledTimes(1);

      // A subsequent rerender with the same error must not re-fire.
      rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      expect(mockToastShowToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-provider dedup', () => {
    // Mirrors production reality: HomeTabs mounts a sheet-mode provider above
    // Tab.Navigator (so the BottomSheet's parent is the full-viewport stack
    // card), and PredictScreenStack mounts another sheet-mode provider when
    // the user navigates into the Predict tab. Both stay mounted while inside
    // Predict. The toast effect must fire from the topmost (most recently
    // mounted, innermost in the tree) provider only.

    it('fires the failure toast only from the topmost (most recently mounted) sheet-mode provider', () => {
      const outer = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      // Outer "remembers" buy params from a prior open + dismiss.
      fireEvent.press(outer.getByTestId('open-buy'));
      fireEvent.press(outer.getByTestId('dismiss-sheet'));

      const inner = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      // Inner also remembers buy params from a prior open + dismiss.
      fireEvent.press(inner.getByTestId('open-buy'));
      fireEvent.press(inner.getByTestId('dismiss-sheet'));

      mockActiveOrder = { error: 'order/failed' };
      outer.rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      inner.rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(mockToastShowToast).toHaveBeenCalledTimes(1);

      outer.unmount();
      inner.unmount();
    });

    it('outer provider becomes active after inner unmounts and fires for the next error transition', () => {
      const outer = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      fireEvent.press(outer.getByTestId('open-buy'));
      fireEvent.press(outer.getByTestId('dismiss-sheet'));

      const inner = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      fireEvent.press(inner.getByTestId('open-buy'));
      fireEvent.press(inner.getByTestId('dismiss-sheet'));

      // First error transition — only inner (topmost) fires.
      mockActiveOrder = { error: 'order/failed' };
      outer.rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      inner.rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      expect(mockToastShowToast).toHaveBeenCalledTimes(1);

      // Inner unmounts — outer becomes the topmost provider.
      inner.unmount();

      // Drive a fresh falsy -> truthy transition for the outer provider so
      // its `previousErrorRef` flips correctly.
      mockActiveOrder = null;
      outer.rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      mockActiveOrder = { error: 'order/failed-2' };
      outer.rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(mockToastShowToast).toHaveBeenCalledTimes(2);

      outer.unmount();
    });

    it('outer (sheet-mode) provider fires when the inner provider is mounted with disableBottomSheet', () => {
      const outer = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      fireEvent.press(outer.getByTestId('open-buy'));
      fireEvent.press(outer.getByTestId('dismiss-sheet'));

      // Disabled provider mounts but does NOT register, so outer remains
      // the topmost (and only) sheet-mode provider.
      const navInner = render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <View />
        </PredictPreviewSheetProvider>,
      );

      mockActiveOrder = { error: 'order/failed' };
      outer.rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(mockToastShowToast).toHaveBeenCalledTimes(1);

      navInner.unmount();
      outer.unmount();
    });

    it('shouldSuppressLegacyOrderFailureToast tracks the topmost provider after unmount order', () => {
      const outer = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      // Outer alone, no opens — suppression off.
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);

      fireEvent.press(outer.getByTestId('open-buy'));
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(true);

      // Inner mounts on top of outer — its `lastBuyParamsRef` is null,
      // so suppression flips back to false until inner has its own open.
      const inner = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);

      fireEvent.press(inner.getByTestId('open-buy'));
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(true);

      // Unmounting inner falls back to outer (still has params).
      inner.unmount();
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(true);

      outer.unmount();
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);
    });
  });

  describe('failure toast auto-clear timer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const showRetryToast = () => {
      const { rerender, unmount } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));
      fireEvent.press(screen.getByTestId('dismiss-sheet'));

      // `clearOrderError` is called by the dismiss path; reset so subsequent
      // assertions only count timer-driven calls.
      mockClearOrderError.mockClear();

      mockActiveOrder = { error: 'order/failed' };
      rerender(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      return { rerender, unmount };
    };

    it('clears the order error after the toast auto-dismisses (~3s)', () => {
      showRetryToast();
      expect(mockToastShowToast).toHaveBeenCalledTimes(1);
      expect(mockClearOrderError).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockClearOrderError).toHaveBeenCalledTimes(1);
    });

    it('does not clear the order error if Retry is tapped before the timer fires', () => {
      showRetryToast();
      const toastCall = mockToastShowToast.mock.calls[0][0];

      act(() => {
        toastCall.closeButtonOptions.onPress();
      });

      // Advance well past the timer — Retry should have cancelled it.
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockClearOrderError).not.toHaveBeenCalled();
    });

    it('cancels the pending clear timer on provider unmount', () => {
      const { unmount } = showRetryToast();

      unmount();

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockClearOrderError).not.toHaveBeenCalled();
    });
  });

  describe('shouldSuppressLegacyOrderFailureToast', () => {
    it('returns false when provider is not mounted', () => {
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);
    });

    it('returns false while provider is mounted but no sheet has been opened yet', () => {
      // Suppression is gated on the topmost provider's `lastBuyParamsRef` so
      // the legacy toast keeps firing for tabs/flows where the user has not
      // initiated a sheet (e.g. order failure surfaces from elsewhere).
      const { unmount } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);

      unmount();
    });

    it('returns true after openBuySheet is called and false after unmount', () => {
      const { unmount } = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));

      expect(shouldSuppressLegacyOrderFailureToast()).toBe(true);

      unmount();

      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);
    });

    it('returns false when provider is mounted with disableBottomSheet=true', () => {
      const { unmount } = render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);

      unmount();
    });

    it('returns false after unmounting a disableBottomSheet provider', () => {
      const { unmount } = render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      unmount();

      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);
    });

    it('stays true when disableBottomSheet provider unmounts while sheet-mode provider is still mounted', () => {
      const sheetRender = render(
        <PredictPreviewSheetProvider>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );
      // Open a buy sheet on the sheet-mode provider so it has remembered
      // params (`hasBuyParams()` now gates suppression).
      fireEvent.press(sheetRender.getByTestId('open-buy'));

      const navRender = render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(shouldSuppressLegacyOrderFailureToast()).toBe(true);

      // Unmounting the navigate-mode provider must not clear the sheet-mode one
      navRender.unmount();
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(true);

      sheetRender.unmount();
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);
    });
  });

  describe('disableBottomSheet prop', () => {
    it('navigates to BUY_PREVIEW instead of opening sheet when disableBottomSheet=true and flag is ON', () => {
      render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: { ...buyParams, trackSwipeDismiss: true },
      });
      expect(
        screen.queryByTestId('predict-buy-preview-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('navigates to SELL_PREVIEW instead of opening sheet when disableBottomSheet=true and flag is ON', () => {
      render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-sell'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
        params: sellParams,
      });
      expect(
        screen.queryByTestId('predict-sell-preview-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('navigates to BUY_PREVIEW and does not count as sheet-mode when bottomSheetEnabled is OFF and disableBottomSheet is true', () => {
      mockBottomSheetEnabled = false;

      render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));

      // Both flags force navigate — disableBottomSheet still sets trackSwipeDismiss
      // so the beforeRemove listener works if the screen ever renders.
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
        params: { ...buyParams, trackSwipeDismiss: true },
      });
      // Provider is mounted but NOT in sheet mode — toast must not be suppressed.
      expect(shouldSuppressLegacyOrderFailureToast()).toBe(false);
    });

    it('does not auto-reopen buy sheet when disableBottomSheet=true', () => {
      const { rerender } = render(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      fireEvent.press(screen.getByTestId('open-buy'));

      mockActiveOrder = { error: 'order/failed' };
      rerender(
        <PredictPreviewSheetProvider disableBottomSheet>
          <TestConsumer />
        </PredictPreviewSheetProvider>,
      );

      expect(
        screen.queryByTestId('predict-buy-preview-sheet'),
      ).not.toBeOnTheScreen();
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
