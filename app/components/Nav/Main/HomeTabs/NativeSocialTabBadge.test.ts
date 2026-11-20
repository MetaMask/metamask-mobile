import React from 'react';
import { render } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import {
  TAB_BAR_FLOATING_GAP,
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import NativeSocialTabBadge, {
  getNativeSocialTabBadgePosition,
  NATIVE_TAB_ICON_SIZE,
  SOCIAL_TAB_BADGE_OVERLAY_TEST_ID,
} from './NativeSocialTabBadge';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

const mockUseWindowDimensions = jest.mocked(useWindowDimensions);

describe('getNativeSocialTabBadgePosition', () => {
  it('places the badge over the final app tab before the detached search slot', () => {
    const input = {
      width: 390,
      height: 844,
      bottomInset: 34,
      tabIndex: 3,
      tabCount: 4,
    };
    const tabBarWidth =
      input.width -
      TAB_BAR_FLOATING_HORIZONTAL_INSET * 2 -
      TAB_BAR_FLOATING_GAP -
      TAB_BAR_FLOATING_HEIGHT;
    const tabWidth = tabBarWidth / input.tabCount;

    const result = getNativeSocialTabBadgePosition(input);

    expect(result).toEqual({
      left:
        TAB_BAR_FLOATING_HORIZONTAL_INSET +
        tabWidth * (input.tabIndex + 0.5) -
        NATIVE_TAB_ICON_SIZE / 2,
      top:
        input.height -
        getTabBarFloatingBottomPadding(input.bottomInset) -
        TAB_BAR_FLOATING_HEIGHT +
        6,
    });
  });

  it('uses a custom icon size when positioning a floating tab badge', () => {
    const input = {
      width: 390,
      height: 844,
      bottomInset: 34,
      tabIndex: 3,
      tabCount: 4,
      iconSize: 24,
    };

    const result = getNativeSocialTabBadgePosition(input);

    expect(result.left).toBe(
      TAB_BAR_FLOATING_HORIZONTAL_INSET +
        ((input.width -
          TAB_BAR_FLOATING_HORIZONTAL_INSET * 2 -
          TAB_BAR_FLOATING_GAP -
          TAB_BAR_FLOATING_HEIGHT) /
          input.tabCount) *
          (input.tabIndex + 0.5) -
        input.iconSize / 2,
    );
  });
});

describe('NativeSocialTabBadge', () => {
  beforeEach(() => {
    mockUseWindowDimensions.mockReturnValue({
      width: 390,
      height: 844,
      scale: 2,
      fontScale: 2,
    });
  });

  it('renders the non-interactive Social badge overlay', () => {
    const { UNSAFE_getAllByProps: getAllByProps } = render(
      React.createElement(NativeSocialTabBadge, { tabIndex: 3, tabCount: 4 }),
    );

    const badge = getAllByProps({
      testID: SOCIAL_TAB_BADGE_OVERLAY_TEST_ID,
    })[0];

    expect(badge.props.testID).toBe(SOCIAL_TAB_BADGE_OVERLAY_TEST_ID);
  });

  it('hides the visual overlay from assistive technology', () => {
    const { UNSAFE_getAllByProps: getAllByProps } = render(
      React.createElement(NativeSocialTabBadge, { tabIndex: 3, tabCount: 4 }),
    );

    const overlay = getAllByProps({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    })[0];

    expect(overlay.props).toEqual(
      expect.objectContaining({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }),
    );
  });
});
