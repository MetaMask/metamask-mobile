import React from 'react';
import { act, render } from '@testing-library/react-native';
import type { NativeBottomTabNavigationProp } from '@react-navigation/bottom-tabs/unstable';
import type { ParamListBase } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import initialRootState from '../../../../util/test/initial-root-state';
import { trackExploreSearchOpened } from '../../../Views/TrendingView/search/analytics';
import ExploreSearchScreen from '../../../Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import { NATIVE_TRADE_ICONS } from './homeTabs.icons';
import { SEARCH_TAB_NAME, TRADE_TAB_NAME } from './homeTabs.mappers';
import { useNativeSystemSlotTab } from './useNativeSystemSlotTab';

jest.mock('../../../../util/haptics');

jest.mock('../../../Views/TrendingView/search/analytics', () => ({
  trackExploreSearchOpened: jest.fn(),
}));

jest.mock(
  '../../../Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn();
const mockCreateEventBuilder = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as NativeBottomTabNavigationProp<ParamListBase>;

const resolveIcon = (
  options: ReturnType<typeof useNativeSystemSlotTab>['options'],
) => {
  const { tabBarIcon } = options;
  if (typeof tabBarIcon !== 'function') {
    throw new Error('expected an icon resolver');
  }
  return tabBarIcon({ focused: false });
};

describe('useNativeSystemSlotTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({ name: 'built' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
  });

  describe('search-focused arm', () => {
    it('renders the system search item with the search screen', () => {
      const { result } = renderHookWithProvider(
        () => useNativeSystemSlotTab('search'),
        { state: initialRootState },
      );

      expect(result.current.name).toBe(SEARCH_TAB_NAME);
      expect(result.current.options).toEqual({ tabBarSystemItem: 'search' });
      expect(result.current.component).toBe(ExploreSearchScreen);
    });

    it('plays the tab haptic and tracks the search opening on press', () => {
      const { result } = renderHookWithProvider(
        () => useNativeSystemSlotTab('search'),
        { state: initialRootState },
      );

      result.current.listeners({ navigation: mockNavigation }).tabPress();

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.TabChange);
      expect(trackExploreSearchOpened).toHaveBeenCalledWith('nav_bar');
    });
  });

  describe('trade-focused arm', () => {
    it('repurposes the search slot as a non-selectable Trade button', () => {
      const { result } = renderHookWithProvider(
        () => useNativeSystemSlotTab('trade'),
        { state: initialRootState },
      );

      expect(result.current.name).toBe(TRADE_TAB_NAME);
      expect(result.current.options).toMatchObject({
        tabBarSystemItem: 'search',
        tabBarSelectionEnabled: false,
        tabBarLabel: 'Trade',
      });
      expect(resolveIcon(result.current.options)).toEqual({
        type: 'image',
        source: NATIVE_TRADE_ICONS.closed,
        tinted: true,
      });
      expect(
        render(React.createElement(result.current.component)).toJSON(),
      ).toBeNull();
    });

    it('opens the glass tray above the bar and reports the press', () => {
      const { result } = renderHookWithProvider(
        () => useNativeSystemSlotTab('trade'),
        { state: initialRootState },
      );

      act(() => {
        result.current.listeners({ navigation: mockNavigation }).tabPress();
      });

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.TabChange);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
          params: expect.objectContaining({
            hasBottomNotch: false,
            anchorsToTabBar: true,
          }),
        },
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTIONS_BUTTON_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'built' });
    });

    it('flips the glyph to a close mark while the tray is open', () => {
      const { result } = renderHookWithProvider(
        () => useNativeSystemSlotTab('trade'),
        { state: initialRootState },
      );

      act(() => {
        result.current.listeners({ navigation: mockNavigation }).tabPress();
      });
      expect(resolveIcon(result.current.options)).toEqual({
        type: 'image',
        source: NATIVE_TRADE_ICONS.open,
        tinted: true,
      });

      const { params }: { params: { onDismiss: () => void } } =
        mockNavigate.mock.calls[0][1];
      act(() => {
        params.onDismiss();
      });

      expect(resolveIcon(result.current.options)).toEqual({
        type: 'image',
        source: NATIVE_TRADE_ICONS.closed,
        tinted: true,
      });
    });
  });
});
