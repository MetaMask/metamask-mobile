import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { playImpact, playSelection } from '#app/util/haptics';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { SOCIAL_FEED_REALTIME_BUFFER_SIZE } from '#app/components/UI/SocialFeed/data/socialFeedRealtime';
import PendingPostsButton, {
  getPendingPostsAccessibilityLabel,
  getPendingPostsLabelParts,
  PENDING_POSTS_PILL_TEST_ID,
  PENDING_POSTS_SLOTS_PROBE_TEST_ID,
} from './PendingPostsButton';

jest.mock('#app/util/haptics', () => ({
  playImpact: jest.fn(() => Promise.resolve()),
  playSelection: jest.fn(() => Promise.resolve()),
}));

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

  it('skips the fade animation on Liquid Glass', () => {
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

  it('reserves the full slot width for the rolling count', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={14} onPress={jest.fn()} />,
    );

    const probe = screen.getByTestId(PENDING_POSTS_SLOTS_PROBE_TEST_ID, {
      includeHiddenElements: true,
    });
    const probeStyle = StyleSheet.flatten(probe.props.style);

    expect(probe).toHaveTextContent('00');
    expect(probeStyle).toEqual(
      expect.objectContaining({ height: 0, opacity: 0 }),
    );
    expect(probeStyle.position).toBeUndefined();
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
