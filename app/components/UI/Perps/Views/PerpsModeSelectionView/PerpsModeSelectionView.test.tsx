import { PerpsMode } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsModeSelectionView from './PerpsModeSelectionView';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetMode = jest.fn();
const mockTrack = jest.fn();
const mockGetPerpsHomeNavigationTarget = jest.fn(() => ({
  screen: Routes.PERPS.PERPS_HOME,
  params: {},
}));

let mockIsFirstTimePerpsUser = true;
let mockPerpsMode = PerpsMode.Lite;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../selectors/perpsController', () => ({
  selectIsFirstTimePerpsUser: () => mockIsFirstTimePerpsUser,
}));

jest.mock('../../hooks/usePerpsMode', () => ({
  usePerpsMode: () => ({
    mode: mockPerpsMode,
    setMode: mockSetMode,
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

const mockMarkPerpsModeSelectionCompleted = jest.fn(() => Promise.resolve());
jest.mock('../../utils/perpsModeSelectionStorage', () => ({
  markPerpsModeSelectionCompleted: () => mockMarkPerpsModeSelectionCompleted(),
}));

jest.mock('../../utils/perpsModeSwitch', () => ({
  buildDefaultProMarket: () => ({ symbol: 'BTC', name: 'Bitcoin' }),
  toPerpsNavigatorScreenParams: (target: unknown) => target,
  useGetPerpsHomeNavigationTarget: () => mockGetPerpsHomeNavigationTarget,
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
    mockIsFirstTimePerpsUser = true;
    mockPerpsMode = PerpsMode.Lite;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('persists Lite, dismisses, and continues to the tutorial for first-time users', async () => {
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
        [PERPS_EVENT_PROPERTY.MODE]: PerpsMode.Lite,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      },
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
      source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
    });
  });

  it('persists Pro and continues to the tutorial with a Pro market redirect', async () => {
    render(<PerpsModeSelectionView />);

    fireEvent.press(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION),
    );

    await Promise.resolve();

    expect(mockSetMode).toHaveBeenCalledWith(PerpsMode.Pro);
    expect(mockMarkPerpsModeSelectionCompleted).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
      source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      redirectScreen: Routes.PERPS.MARKET_DETAILS,
      redirectParams: {
        market: { symbol: 'BTC', name: 'Bitcoin' },
        source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      },
    });
  });

  it('continues to the Pro-aware home target for returning users', async () => {
    mockIsFirstTimePerpsUser = false;

    render(<PerpsModeSelectionView />);

    fireEvent.press(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION),
    );

    await Promise.resolve();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: {},
    });
  });
});
