import { PerpsMode } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { PERPS_MODE_ANALYTICS_PROPERTY } from '../../utils/perpsModeAnalytics';
import {
  PERPS_MODE_SELECTION_DISMISSED,
  PERPS_MODE_SELECTION_SCREEN_TYPE,
} from '../../utils/openPerpsModeSelection';
import PerpsModeSelectionView from './PerpsModeSelectionView';

const proEntrySequence: string[] = [];
const mockGoBack = jest.fn(() => {
  proEntrySequence.push('leave');
});
const mockNavigate = jest.fn(() => {
  proEntrySequence.push('continue');
});
const mockGetParentReset = jest.fn(() => {
  proEntrySequence.push('leave');
});
const mockGetParentGetState = jest.fn(() => ({
  index: 2,
  routes: [
    { name: Routes.PERPS.PERPS_HOME, key: 'home-1' },
    { name: Routes.PERPS.MARKET_DETAILS, key: 'market-1' },
    { name: Routes.PERPS.MODALS.ROOT, key: 'modal-1' },
  ],
}));
const mockSetMode = jest.fn();
const mockTrack = jest.fn();
const mockNavigationListeners: Record<string, (() => void)[]> = {};
const mockAddListener = jest.fn(
  (event: string, cb: () => void): (() => void) => {
    (mockNavigationListeners[event] ||= []).push(cb);
    return jest.fn();
  },
);

const fireNavigationEvent = (event: string) => {
  (mockNavigationListeners[event] || []).forEach((cb) => cb());
};

let mockIsProModeEnabled = true;
let mockPerpsMode = PerpsMode.Lite;
let mockRouteParams: { entry?: string; source?: string } = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
    getParent: () => ({
      getState: mockGetParentGetState,
      reset: mockGetParentReset,
    }),
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: () => unknown) => selector(),
}));

const mockWatchlistSymbols: string[] = [];
const mockHeaderVariant: { destination: 'lastViewedMarket' | 'marketList' } = {
  destination: 'lastViewedMarket',
};
const mockReact = React;

jest.mock('../../../../../hooks/useABTest', () => ({
  useABTest: (
    _flagKey: string,
    _variants: unknown,
    metadata?: { trackExposure?: boolean },
  ) => {
    // Mirrors useABTest: Experiment Viewed is an effect, so it only runs
    // after a commit where trackExposure is true.
    mockReact.useEffect(() => {
      if (metadata?.trackExposure) {
        proEntrySequence.push('experiment-viewed');
      }
    }, [metadata?.trackExposure]);

    return {
      variant: mockHeaderVariant,
      variantName:
        mockHeaderVariant.destination === 'marketList'
          ? 'treatment'
          : 'control',
      isActive: mockHeaderVariant.destination === 'marketList',
    };
  },
}));

jest.mock('../../selectors/perpsController', () => ({
  selectPerpsLastViewedMarketSymbol: () => 'BTC',
  selectPerpsWatchlistMarkets: () => mockWatchlistSymbols,
  selectPerpsMode: () => mockPerpsMode,
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectPerpsProModeEnabledFlag: () => mockIsProModeEnabled,
  selectPerpsWatchlistEnabledFlag: () => true,
}));

jest.mock('../../hooks/usePerpsMode', () => ({
  usePerpsMode: () => ({
    mode: mockPerpsMode,
    setMode: mockSetMode,
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: (options?: {
    eventName?: unknown;
    properties?: Record<string, unknown>;
  }) => {
    // Declarative mount tracking (impression) — mirror immediate-track behavior.
    if (options?.eventName) {
      mockTrack(options.eventName, options.properties ?? {});
    }
    return { track: mockTrack };
  },
}));

const mockMarkPerpsModeSelectionCompleted = jest.fn(() => Promise.resolve());
jest.mock('../../utils/perpsModeSelectionStorage', () => ({
  markPerpsModeSelectionCompleted: () => mockMarkPerpsModeSelectionCompleted(),
}));

jest.mock('../../utils/perpsModeSwitch', () => ({
  buildDefaultProMarket: () => ({ symbol: 'BTC', name: 'Bitcoin' }),
  toPerpsNavigatorScreenParams: (target: unknown) => target,
  resolvePerpsHomeNavigationTarget: jest.requireActual(
    '../../utils/perpsModeSwitch',
  ).resolvePerpsHomeNavigationTarget,
  dropPerpsHomeFromStackHistory: jest.requireActual(
    '../../utils/perpsModeSwitch',
  ).dropPerpsHomeFromStackHistory,
  withHomeDroppedFromHistory: jest.requireActual('../../utils/perpsModeSwitch')
    .withHomeDroppedFromHistory,
  useIsPerpsProModeActive: jest.requireActual('../../utils/perpsModeSwitch')
    .useIsPerpsProModeActive,
  PERPS_DEFAULT_PRO_MARKET_SYMBOL: 'BTC',
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.mode.selection_title': 'Choose how you trade',
      'perps.mode.lite': 'Lite',
      'perps.mode.lite_description':
        'One-tap longs or shorts. Simple by design.',
      'perps.mode.pro': 'Pro',
      'perps.mode.pro_description':
        'Order book, advanced order types, and leverage.',
    };
    return translations[key] ?? key;
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

describe('PerpsModeSelectionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockNavigationListeners).forEach((key) => {
      delete mockNavigationListeners[key];
    });
    mockIsProModeEnabled = true;
    mockPerpsMode = PerpsMode.Lite;
    mockRouteParams = {};
    mockHeaderVariant.destination = 'lastViewedMarket';
    mockWatchlistSymbols.splice(0, mockWatchlistSymbols.length);
    proEntrySequence.length = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits a chooser impression on mount with source and entry', () => {
    mockRouteParams = {
      entry: 'home',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    };

    render(<PerpsModeSelectionView />);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_SCREEN_VIEWED,
      {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_MODE_SELECTION_SCREEN_TYPE,
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
        entry: 'home',
      },
    );
  });

  it('defaults impression entry/source when route params are omitted', () => {
    render(<PerpsModeSelectionView />);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_SCREEN_VIEWED,
      {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_MODE_SELECTION_SCREEN_TYPE,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
        entry: 'trade',
      },
    );
  });

  it('pre-selects the current Perps mode', () => {
    mockPerpsMode = PerpsMode.Pro;

    render(<PerpsModeSelectionView />);

    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION)
        .props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION)
        .props.accessibilityState,
    ).toEqual({ selected: false });
  });

  it('persists Lite, dismisses, and continues to Perps Home for first-time users', async () => {
    render(<PerpsModeSelectionView />);

    fireEvent.press(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION),
    );

    await Promise.resolve();

    expect(mockSetMode).toHaveBeenCalledWith(PerpsMode.Lite);
    expect(mockMarkPerpsModeSelectionCompleted).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_MODE_ANALYTICS_PROPERTY]: PerpsMode.Lite,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
        entry: 'trade',
      },
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION },
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.PERPS.TUTORIAL,
      expect.anything(),
    );
  });

  // Home/trade Pro-selection cases that drive real assignment/exposure
  // (useABTest via usePerpsHeaderEntryNavigation) moved to
  // PerpsModeSelectionView.view.test.tsx, which exercises the real hook
  // against Redux flag/mode/watchlist state instead of this file's
  // replacement useABTest effect. Kept here: Lite/dismiss/market-entry
  // contracts below, none of which arm Pro-entry exposure.

  it('drops Perps Home from the parent stack when selecting Pro from a market', async () => {
    mockRouteParams = {
      entry: 'market',
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    };

    render(<PerpsModeSelectionView />);

    fireEvent.press(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION),
    );

    await Promise.resolve();

    expect(mockSetMode).toHaveBeenCalledWith(PerpsMode.Pro);
    expect(mockGetParentReset).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 1,
        routes: [
          {
            name: Routes.PERPS.MARKET_DETAILS,
            key: 'market-1',
            params: { homeDroppedFromHistory: true },
          },
          {
            name: Routes.PERPS.MODALS.ROOT,
            key: 'modal-1',
            params: { homeDroppedFromHistory: true },
          },
        ],
      }),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(proEntrySequence).not.toContain('experiment-viewed');
  });

  it('dismisses only when selecting Lite from a market header', async () => {
    mockRouteParams = {
      entry: 'market',
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    };

    render(<PerpsModeSelectionView />);

    fireEvent.press(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION),
    );

    await Promise.resolve();

    expect(mockSetMode).toHaveBeenCalledWith(PerpsMode.Lite);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGetParentReset).not.toHaveBeenCalled();
  });

  it('emits mode_selection_dismissed on beforeRemove without a selection', () => {
    jest.spyOn(Date, 'now').mockReturnValue(5_000);
    mockRouteParams = {
      entry: 'home',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    };

    render(<PerpsModeSelectionView />);
    mockTrack.mockClear();

    jest.spyOn(Date, 'now').mockReturnValue(5_250);
    fireNavigationEvent('beforeRemove');

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: PERPS_MODE_SELECTION_DISMISSED,
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
        [PERPS_EVENT_PROPERTY.TIME_ON_SCREEN_MS]: 250,
        entry: 'home',
      },
    );
  });

  it('measures time on screen from when the chooser opened, not from a later update', () => {
    jest.spyOn(Date, 'now').mockReturnValue(5_000);

    const { rerender } = render(<PerpsModeSelectionView />);
    mockTrack.mockClear();

    // The dismissal continuation derives from the Pro flag, so flipping it
    // re-creates the callback. Resubscribing must not restart the timer.
    jest.spyOn(Date, 'now').mockReturnValue(5_400);
    mockIsProModeEnabled = false;
    rerender(<PerpsModeSelectionView />);

    jest.spyOn(Date, 'now').mockReturnValue(5_600);
    fireNavigationEvent('beforeRemove');

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: PERPS_MODE_SELECTION_DISMISSED,
        [PERPS_EVENT_PROPERTY.TIME_ON_SCREEN_MS]: 600,
      }),
    );
  });

  it('emits mode_selection_dismissed at most once across close and beforeRemove', () => {
    render(<PerpsModeSelectionView />);
    mockTrack.mockClear();

    // Sheet goBack prop → handleClose (emit + navigation.goBack).
    // In production beforeRemove also fires after goBack; both must not double-count.
    fireNavigationEvent('beforeRemove');
    fireNavigationEvent('beforeRemove');

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: PERPS_MODE_SELECTION_DISMISSED,
      }),
    );
  });

  it('does not emit dismiss after the user selects a mode', async () => {
    render(<PerpsModeSelectionView />);

    fireEvent.press(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION),
    );
    await Promise.resolve();

    mockTrack.mockClear();
    fireNavigationEvent('beforeRemove');

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('continues to Perps Home when the Trade-menu chooser is dismissed', () => {
    render(<PerpsModeSelectionView />);

    fireNavigationEvent('beforeRemove');

    expect(mockMarkPerpsModeSelectionCompleted).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION },
    });
  });

  it('still emits mode_selection_dismissed when a dismissal continues into Perps', () => {
    render(<PerpsModeSelectionView />);
    mockTrack.mockClear();

    fireNavigationEvent('beforeRemove');

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: PERPS_MODE_SELECTION_DISMISSED,
        entry: 'trade',
      }),
    );
  });

  it('does not emit an intentional selection event when a dismissal continues', () => {
    render(<PerpsModeSelectionView />);
    mockTrack.mockClear();

    fireNavigationEvent('beforeRemove');

    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      }),
    );
  });

  it('continues to the pre-selected mode rather than always Lite', () => {
    mockPerpsMode = PerpsMode.Pro;

    render(<PerpsModeSelectionView />);

    fireNavigationEvent('beforeRemove');

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: expect.objectContaining({ symbol: 'BTC' }),
        source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      },
    });
  });

  it('continues at most once across repeated dismissal events', () => {
    render(<PerpsModeSelectionView />);

    fireNavigationEvent('beforeRemove');
    fireNavigationEvent('beforeRemove');

    expect(mockMarkPerpsModeSelectionCompleted).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('stays put when the chooser is dismissed from the Perps home header', () => {
    mockRouteParams = {
      entry: 'home',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    };

    render(<PerpsModeSelectionView />);

    fireNavigationEvent('beforeRemove');

    expect(mockMarkPerpsModeSelectionCompleted).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGetParentReset).not.toHaveBeenCalled();
  });

  it('stays put when the chooser is dismissed from a market header', () => {
    mockRouteParams = {
      entry: 'market',
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    };

    render(<PerpsModeSelectionView />);

    fireNavigationEvent('beforeRemove');

    expect(mockMarkPerpsModeSelectionCompleted).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not continue a second time after the user selects a mode', async () => {
    render(<PerpsModeSelectionView />);

    fireEvent.press(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION),
    );
    await Promise.resolve();

    fireNavigationEvent('beforeRemove');

    expect(mockMarkPerpsModeSelectionCompleted).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
