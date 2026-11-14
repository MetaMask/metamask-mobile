import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Dimensions } from 'react-native';
import { getHardwareTier } from '../../../../util/deviceCapability';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { FEED_REACTION_EMOJIS } from '../reactions';
import ReactionPickerBalloon, {
  REACTION_TRAY_SURFACE_TEST_IDS,
  getTrayRects,
} from './ReactionPickerBalloon';
import { ReactionPickerBalloonSelectorsIDs } from './ReactionPickerBalloon.testIds';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const mockGetHardwareTier = jest.mocked(getHardwareTier);

const PLAIN_MATERIAL = {
  isGlassEnabled: false,
  glassColorScheme: 'dark',
  isBlurEnabled: false,
  blurTint: 'systemChromeMaterialDark',
};

const mockUseLiquidGlass = jest.fn(() => PLAIN_MATERIAL);
jest.mock('../../../../component-library/hooks/useLiquidGlass', () => ({
  useLiquidGlass: () => mockUseLiquidGlass(),
}));

const mockGlassView = jest.fn();
jest.mock('expo-glass-effect', () => {
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: (props: { testID?: string }) => {
      mockGlassView(props);
      return <View testID={props.testID} />;
    },
  };
});

jest.mock('expo-blur', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BlurView: (props: { testID?: string }) => <View testID={props.testID} />,
  };
});

describe('ReactionPickerBalloon', () => {
  const anchor = { x: 20, y: 120, width: 40, height: 24 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLiquidGlass.mockReturnValue(PLAIN_MATERIAL);
    mockGetHardwareTier.mockReturnValue('HIGH');
  });

  const waitForTrayOpen = async () => {
    await waitFor(() => {
      expect(
        screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
      ).toHaveProp('scrollEnabled', true);
    });
  };

  const renderTray = () =>
    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={jest.fn()}
        onPick={jest.fn()}
      />,
    );

  it('draws non-interactive Liquid Glass in the app theme when glass is available', () => {
    mockUseLiquidGlass.mockReturnValue({
      ...PLAIN_MATERIAL,
      isGlassEnabled: true,
    });

    renderTray();

    expect(
      screen.getByTestId(REACTION_TRAY_SURFACE_TEST_IDS.GLASS),
    ).toBeOnTheScreen();
    expect(mockGlassView).toHaveBeenCalledWith(
      expect.objectContaining({
        glassEffectStyle: 'regular',
        colorScheme: 'dark',
        isInteractive: false,
      }),
    );
    expect(screen.getByTestId(REACTION_TRAY_SURFACE_TEST_IDS.TINT)).toHaveStyle(
      { opacity: 0.8 },
    );
  });

  it('draws the chrome blur on iOS without Liquid Glass', () => {
    mockUseLiquidGlass.mockReturnValue({
      ...PLAIN_MATERIAL,
      isBlurEnabled: true,
    });

    renderTray();

    expect(
      screen.getByTestId(REACTION_TRAY_SURFACE_TEST_IDS.BLUR),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(REACTION_TRAY_SURFACE_TEST_IDS.GLASS),
    ).toBeNull();
    expect(screen.getByTestId(REACTION_TRAY_SURFACE_TEST_IDS.TINT)).toHaveStyle(
      { opacity: 0.8 },
    );
  });

  it('draws an opaque pill when neither glass nor blur is available', () => {
    renderTray();

    expect(
      screen.getByTestId(REACTION_TRAY_SURFACE_TEST_IDS.PLAIN),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(REACTION_TRAY_SURFACE_TEST_IDS.BLUR),
    ).toBeNull();
    expect(
      screen.queryByTestId(REACTION_TRAY_SURFACE_TEST_IDS.GLASS),
    ).toBeNull();
    expect(
      screen.queryByTestId(REACTION_TRAY_SURFACE_TEST_IDS.TINT),
    ).toBeNull();
  });

  it('calls onPick with the tapped emoji', async () => {
    const onPick = jest.fn();

    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={jest.fn()}
        onPick={onPick}
      />,
    );
    await waitForTrayOpen();

    fireEvent.press(
      screen.getByTestId(`${ReactionPickerBalloonSelectorsIDs.EMOJI}-🔥`),
    );

    expect(onPick).toHaveBeenCalledWith('🔥');
  });

  it('renders the full reaction set in a horizontal strip', () => {
    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={jest.fn()}
        onPick={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
    ).toBeOnTheScreen();
    FEED_REACTION_EMOJIS.forEach((emotion) => {
      expect(
        screen.getByTestId(
          `${ReactionPickerBalloonSelectorsIDs.EMOJI}-${emotion}`,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('lets the emoji row glide and bounce', () => {
    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={jest.fn()}
        onPick={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
    ).toHaveProp('bounces', true);
    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
    ).toHaveProp('decelerationRate', 'normal');
    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
    ).not.toHaveProp('pagingEnabled', true);
  });

  it('calls onClose when the scrim is pressed', async () => {
    const onClose = jest.fn();

    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={onClose}
        onPick={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.SCRIM),
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('grows from the emoji button to a full-width tray above it', () => {
    const windowWidth = 402;

    const { from, to, opensBelow } = getTrayRects(anchor, windowWidth, 8);

    expect(from).toEqual({
      left: 20,
      top: 120,
      width: 40,
      height: 24,
      borderRadius: 12,
    });
    expect(to).toEqual({
      left: 16,
      top: 60,
      width: 370,
      height: 52,
      borderRadius: 26,
    });
    expect(opensBelow).toBe(false);
  });

  it('opens below the emoji button when the status bar leaves no room above', () => {
    const nearTop = { x: 20, y: 90, width: 40, height: 24 };

    const { to, opensBelow } = getTrayRects(nearTop, 402, 67);

    expect(opensBelow).toBe(true);
    expect(to.top).toBe(122);
  });

  it('starts at the button and holds scrolling until the grow settles', async () => {
    renderTray();

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toHaveStyle({
      left: 20,
      top: 120,
      width: 40,
      height: 24,
      borderRadius: 12,
    });
    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
    ).toHaveProp('scrollEnabled', false);

    await waitForTrayOpen();

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toHaveProp('pointerEvents', 'auto');
  });

  it('opens in place without the grow on low-end devices', () => {
    mockGetHardwareTier.mockReturnValue('LOW');

    renderTray();

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toHaveStyle({
      left: 16,
      top: 60,
      width: Dimensions.get('window').width - 32,
      height: 52,
      borderRadius: 26,
    });
    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
    ).toHaveProp('scrollEnabled', true);
  });

  it('keeps the grow when the hardware tier is unknown', () => {
    mockGetHardwareTier.mockReturnValue(null);

    renderTray();

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toHaveStyle({ left: 20, width: 40 });
  });
});
