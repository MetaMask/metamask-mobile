import React from 'react';
import { render } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import NativeSocialTabBadge, {
  getNativeSocialTabBadgePosition,
  SOCIAL_TAB_BADGE_OVERLAY_TEST_ID,
} from './NativeSocialTabBadge';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

const mockUseWindowDimensions = jest.mocked(useWindowDimensions);

describe('getNativeSocialTabBadgePosition', () => {
  it('returns the expected position for the final app tab', () => {
    const input = {
      width: 390,
      height: 844,
      bottomInset: 34,
      tabIndex: 3,
      tabCount: 4,
    };

    const result = getNativeSocialTabBadgePosition(input);

    expect(result).toEqual({
      left: 247.25,
      top: 766,
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

    expect(result.left).toBe(249.25);
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
