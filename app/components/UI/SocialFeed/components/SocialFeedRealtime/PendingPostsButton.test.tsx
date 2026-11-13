import React from 'react';
import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { fireEvent, screen } from '@testing-library/react-native';

import { playImpact, playSelection } from '#app/util/haptics';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { SOCIAL_FEED_REALTIME_BUFFER_SIZE } from '#app/components/UI/SocialFeed/data/socialFeedRealtime';
import PendingPostsButton, {
  getPendingPostsAccessibilityLabel,
  getPendingPostsLabelParts,
  PENDING_POSTS_COUNT_TEST_ID,
  PENDING_POSTS_PILL_TEST_ID,
} from './PendingPostsButton';

jest.mock('#app/util/haptics', () => ({
  playImpact: jest.fn(() => Promise.resolve()),
  playSelection: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    useReducedMotion: jest.fn(() => false),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const mockPlayImpact = jest.mocked(playImpact);
const mockPlaySelection = jest.mocked(playSelection);

const mockUseLiquidGlass = jest.fn();
jest.mock('#app/component-library/hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockUseLiquidGlass(),
}));

const mockGlassView = jest.fn();
jest.mock('expo-glass-effect', () => {
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: (props: { children?: React.ReactNode; testID?: string }) => {
      mockGlassView(props);
      return <View testID={props.testID}>{props.children}</View>;
    },
  };
});

const PLAIN_SURFACE = {
  isGlassEnabled: false,
  isBlurEnabled: false,
  glassColorScheme: 'light',
  blurTint: 'systemChromeMaterialLight',
};

describe('getPendingPostsLabelParts', () => {
  it('splits the localized label around the count', () => {
    const parts = getPendingPostsLabelParts(14);

    expect(parts).toEqual({
      label: '14 new',
      leading: '',
      count: '14',
      trailing: ' new',
    });
  });

  it('keeps the cap marker attached to the capped count', () => {
    const parts = getPendingPostsLabelParts(
      SOCIAL_FEED_REALTIME_BUFFER_SIZE + 5,
    );

    expect(parts).toEqual({
      label: `${SOCIAL_FEED_REALTIME_BUFFER_SIZE}+ new`,
      leading: '',
      count: String(SOCIAL_FEED_REALTIME_BUFFER_SIZE),
      trailing: '+ new',
    });
  });
});

describe('getPendingPostsAccessibilityLabel', () => {
  it('uses the singular form for one update', () => {
    const label = getPendingPostsAccessibilityLabel(1);

    expect(label).toBe('1 new update');
  });

  it('uses the plural form for several updates', () => {
    const label = getPendingPostsAccessibilityLabel(14);

    expect(label).toBe('14 new updates');
  });

  it('caps the count at the realtime buffer size', () => {
    const label = getPendingPostsAccessibilityLabel(
      SOCIAL_FEED_REALTIME_BUFFER_SIZE + 5,
    );

    expect(label).toBe(`${SOCIAL_FEED_REALTIME_BUFFER_SIZE}+ new updates`);
  });
});

describe('PendingPostsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLiquidGlass.mockReturnValue(PLAIN_SURFACE);
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders the pill on Liquid Glass when glass is enabled', () => {
    mockUseLiquidGlass.mockReturnValue({
      ...PLAIN_SURFACE,
      isGlassEnabled: true,
      glassColorScheme: 'dark',
    });

    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={jest.fn()} />,
    );

    expect(mockGlassView).toHaveBeenCalledWith(
      expect.objectContaining({
        glassEffectStyle: 'regular',
        colorScheme: 'dark',
        isInteractive: true,
      }),
    );
    expect(screen.getByLabelText('3 new updates')).toBeOnTheScreen();
  });

  it('slides the Liquid Glass pill without mount animations', () => {
    mockUseLiquidGlass.mockReturnValue({
      ...PLAIN_SURFACE,
      isGlassEnabled: true,
      glassColorScheme: 'dark',
    });

    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={jest.fn()} />,
    );

    const pill = screen.getByTestId(PENDING_POSTS_PILL_TEST_ID);
    expect(pill.props.entering).toBeUndefined();
    expect(pill.props.exiting).toBeUndefined();
    expect(pill.props.pointerEvents).toBe('auto');
  });

  it('keeps the Liquid Glass pill mounted and hidden without pending updates', () => {
    mockUseLiquidGlass.mockReturnValue({
      ...PLAIN_SURFACE,
      isGlassEnabled: true,
    });

    renderWithProvider(
      <PendingPostsButton pendingNewCount={0} onPress={jest.fn()} />,
    );

    const pill = screen.getByTestId(PENDING_POSTS_PILL_TEST_ID, {
      includeHiddenElements: true,
    });
    expect(mockGlassView).toHaveBeenCalled();
    expect(pill.props.pointerEvents).toBe('none');
    expect(pill.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByLabelText(/new update/)).toBeNull();
  });

  it('keeps the last count on the Liquid Glass pill while it slides out', () => {
    mockUseLiquidGlass.mockReturnValue({
      ...PLAIN_SURFACE,
      isBlurEnabled: true,
    });
    const { rerender } = renderWithProvider(
      <PendingPostsButton pendingNewCount={4} onPress={jest.fn()} />,
    );

    rerender(<PendingPostsButton pendingNewCount={0} onPress={jest.fn()} />);

    expect(
      screen.getByLabelText('4 new updates', { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it('fades the plain pill in and out', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={jest.fn()} />,
    );

    const pill = screen.getByTestId(PENDING_POSTS_PILL_TEST_ID);
    expect(pill.props.entering).toBeDefined();
    expect(pill.props.exiting).toBeDefined();
  });

  it('renders the pill without Liquid Glass when glass is unavailable', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={jest.fn()} />,
    );

    expect(mockGlassView).not.toHaveBeenCalled();
    expect(screen.getByLabelText('3 new updates')).toBeOnTheScreen();
  });

  it('renders the singular pending label', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={1} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('1 new update')).toBeOnTheScreen();
    expect(screen.getByText('new')).toBeOnTheScreen();
  });

  it('renders the plural pending label', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={2} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('2 new updates')).toBeOnTheScreen();
    expect(screen.getByText('new')).toBeOnTheScreen();
  });

  it('caps the label at the realtime buffer size', () => {
    renderWithProvider(
      <PendingPostsButton
        pendingNewCount={SOCIAL_FEED_REALTIME_BUFFER_SIZE}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByLabelText(`${SOCIAL_FEED_REALTIME_BUFFER_SIZE}+ new updates`),
    ).toBeOnTheScreen();
    expect(screen.getByText('+ new')).toBeOnTheScreen();
  });

  it('shows the exact count just under the cap', () => {
    const count = SOCIAL_FEED_REALTIME_BUFFER_SIZE - 1;
    renderWithProvider(
      <PendingPostsButton pendingNewCount={count} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText(`${count} new updates`)).toBeOnTheScreen();
  });

  it('rolls the count in tabular digits so every slot fits its digit', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={14} onPress={jest.fn()} />,
    );

    const count = screen.getByText('14');

    expect(StyleSheet.flatten(count.props.style)).toEqual(
      expect.objectContaining({ fontVariant: ['tabular-nums'] }),
    );
  });

  it('shows the count without rolling when reduced motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderWithProvider(
      <PendingPostsButton pendingNewCount={14} onPress={jest.fn()} />,
    );

    const count = screen.getByTestId(PENDING_POSTS_COUNT_TEST_ID);

    expect(count).toHaveTextContent('14');
    expect(StyleSheet.flatten(count.props.style)).toEqual(
      expect.objectContaining({ fontVariant: ['tabular-nums'] }),
    );
  });

  it('renders nothing without pending updates', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={0} onPress={jest.fn()} />,
    );

    expect(screen.queryByLabelText(/new update/)).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={onPress} />,
    );

    fireEvent.press(screen.getByLabelText('3 new updates'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('plays a selection haptic when pressed', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={jest.fn()} />,
    );

    fireEvent.press(screen.getByLabelText('3 new updates'));

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });
});
