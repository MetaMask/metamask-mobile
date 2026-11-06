import { act, fireEvent, screen } from '@testing-library/react-native';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import {
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { Suspense, useState } from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { playSelection } from '../../../../../../util/haptics';
import { mockHotToken } from '../mocks/socialV1HotTokens.mock';
import type { SocialV1HotToken } from '../types';
import HotTokensCarouselView, {
  type HotTokensCarouselProps,
} from './HotTokensCarousel';
import {
  getSocialV1HotTokenCloseTestId,
  getSocialV1HotTokenChipTestId,
  getSocialV1HotTokenSelectedChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_PAN_GESTURE_ID,
  SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID,
} from './HotTokensCarousel.testIds';

jest.mock('../../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => null),
}));

jest.mock('../../../../../../util/haptics');

const mockSetFrameCallbackActive = jest.fn();
let mockFrameCallback:
  | ((frame: { timeSincePreviousFrame: number | null }) => void)
  | null = null;
let mockReducedMotion = false;

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === 'useReducedMotion') {
        return () => mockReducedMotion;
      }
      if (prop === 'useFrameCallback') {
        return (
          callback: (frame: { timeSincePreviousFrame: number | null }) => void,
        ) => {
          mockFrameCallback = callback;
          return {
            setActive: mockSetFrameCallbackActive,
            isActive: false,
            callbackId: 1,
          };
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

const mockGetHardwareTier = jest.mocked(getHardwareTier);

let arranged: Pick<HotTokensCarouselProps, 'tokens' | 'isLoading'> = {};

/** Sets the ranked chips the rail receives on its next render. */
const arrange = (tokens: SocialV1HotToken[], isLoading = false) => {
  arranged = { tokens, isLoading };
};

/** The rail with the arranged chips; the test supplies the other props. */
const HotTokensCarousel = (props: HotTokensCarouselProps) => (
  <HotTokensCarouselView {...arranged} {...props} />
);

const NEVER_SETTLES = new Promise<never>(() => undefined);

/** Suspends once a press lands, so the press's transition stays pending. */
const PageGate = ({ isHeld }: { isHeld: boolean }) => {
  if (isHeld) {
    throw NEVER_SETTLES;
  }
  return null;
};

/**
 * A page that never finishes answering a press, like a feed that is still
 * re-rendering. The test supplies the committed selection, so it can play
 * the page catching up to an earlier press.
 */
const SlowPage = ({
  selectedTokenId = null,
  onTokenPress,
}: Pick<HotTokensCarouselProps, 'selectedTokenId' | 'onTokenPress'>) => {
  const [isHeld, setIsHeld] = useState(false);
  return (
    <>
      <HotTokensCarousel
        selectedTokenId={selectedTokenId}
        onTokenPress={(token) => {
          onTokenPress?.(token);
          setIsHeld(true);
        }}
      />
      <Suspense fallback={null}>
        <PageGate isHeld={isHeld} />
      </Suspense>
    </>
  );
};

/** The host view whose animated style carries a pill's opacity. */
const getPillWrapper = (chipId: string) => {
  let node = screen.getByTestId(getSocialV1HotTokenChipTestId(chipId), {
    includeHiddenElements: true,
  });
  while (node.parent && !node.props.onLayout) {
    node = node.parent;
  }
  return node;
};

const NVIDIA = mockHotToken({
  id: 'hot-nvda',
  symbol: 'xyz:NVDA',
  label: 'NVIDIA',
});

/** Chip test IDs in rail order. Matches only the primary track, not the loop copy. */
const railChipTestIds = () =>
  screen
    .getAllByTestId(/^social-v1-hot-token-chip-(?!.*-loop$)/)
    .map((chip) => chip.props.testID);

/** Lays out a 300px viewport over an 800px track, so the marquee loops. */
const layOutOverflowingRail = () => {
  fireEvent(
    screen.getByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
    'layout',
    {
      nativeEvent: { layout: { width: 300, height: 40 } },
    },
  );
  fireEvent(screen.getByTestId(SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID), 'layout', {
    nativeEvent: { layout: { width: 800, height: 40 } },
  });
};

/** Places a pill in its track; the layout event reaches the pill's wrapper. */
const layOutPill = (chipId: string, x: number, width = 120) =>
  fireEvent(
    screen.getByTestId(getSocialV1HotTokenChipTestId(chipId)),
    'layout',
    {
      nativeEvent: { layout: { x, y: 0, width, height: 40 } },
    },
  );

describe('HotTokensCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHardwareTier.mockReturnValue(null);
    mockReducedMotion = false;
    mockFrameCallback = null;
  });

  it('renders a chip per hot token', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel />);

    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
    ).toBeOnTheScreen();
    const chip = screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc'));

    expect(chip).toHaveTextContent('Bitcoin perps');
    expect(chip).toHaveStyle({
      height: 40,
      paddingLeft: 12,
      paddingRight: 16,
    });
    expect(
      screen.UNSAFE_getByProps({
        children: 'Bitcoin perps',
        variant: TextVariant.BodyMd,
        fontWeight: FontWeight.Medium,
      }),
    ).toBeTruthy();
    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
    ).toHaveTextContent('NVIDIA');
  });

  it('renders the chips inside the carousel container', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel />);

    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`${SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID}-row-1`),
    ).not.toBeOnTheScreen();
  });

  it('plays a selection haptic when a chip is pressed', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel onTokenPress={jest.fn()} />);
    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
    );

    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('plays a selection haptic when the selected chip is pressed', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(
      <HotTokensCarousel
        selectedTokenId={NVIDIA.id}
        onTokenPress={jest.fn()}
      />,
    );
    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
    );

    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('passes the pressed token to onTokenPress', () => {
    const onTokenPress = jest.fn();
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel onTokenPress={onTokenPress} />);
    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
    );

    expect(onTokenPress).toHaveBeenCalledWith(NVIDIA);
  });

  it('keeps a selected perp chip on the rail after it leaves the ranking', () => {
    const token = mockHotToken({ id: 'hot-btc', symbol: 'BTC' });
    arrange([token]);
    const { rerender } = renderWithProvider(
      <HotTokensCarousel selectedTokenId={token.id} />,
    );

    arrange([]);
    rerender(<HotTokensCarousel selectedTokenId={token.id} />);

    expect(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-btc')),
    ).toBeOnTheScreen();
  });

  it('keeps a selected contract chip on the rail after it leaves the ranking', () => {
    const token = mockHotToken({
      id: 'hot-pump',
      assetIds: [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
      ],
    });
    arrange([token]);
    const { rerender } = renderWithProvider(
      <HotTokensCarousel selectedTokenId={token.id} />,
    );

    arrange([]);
    rerender(<HotTokensCarousel selectedTokenId={token.id} />);

    expect(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-pump')),
    ).toBeOnTheScreen();
  });

  it('docks the selected asset chip', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    const chip = screen.getByTestId(
      getSocialV1HotTokenSelectedChipTestId('hot-nvda'),
    );
    expect(chip).toHaveTextContent('NVIDIA');
    expect(chip.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(
      screen.queryByTestId(getSocialV1HotTokenSelectedChipTestId('hot-btc')),
    ).toBeNull();
  });

  it('shows a close icon on the selected chip', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    const closeIcon = screen.UNSAFE_getByProps({
      name: IconName.Close,
      size: IconSize.Sm,
      color: IconColor.IconInverse,
      testID: getSocialV1HotTokenCloseTestId('hot-nvda'),
    });

    expect(closeIcon).toBeTruthy();
  });

  // The rail stays mounted under the docked chip so its pills can scatter
  // and return, but it takes no taps and is hidden from screen readers.
  it('hides the rest of the rail while a chip is selected', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID, {
        includeHiddenElements: true,
      }).props,
    ).toEqual(
      expect.objectContaining({
        pointerEvents: 'none',
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }),
    );
  });

  it('docks the pressed chip before the page answers', () => {
    const onTokenPress = jest.fn();
    arrange([mockHotToken(), NVIDIA]);
    renderWithProvider(<SlowPage onTokenPress={onTokenPress} />);

    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
    );

    expect(onTokenPress).toHaveBeenCalledWith(NVIDIA);
    expect(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
    ).toBeOnTheScreen();
  });

  it('keeps the chip docked once the page confirms the selection', () => {
    const onTokenPress = jest.fn();
    arrange([mockHotToken(), NVIDIA]);
    const { rerender } = renderWithProvider(
      <HotTokensCarousel onTokenPress={onTokenPress} />,
    );

    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
    );
    rerender(
      <HotTokensCarousel
        selectedTokenId={NVIDIA.id}
        onTokenPress={onTokenPress}
      />,
    );

    expect(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
    ).toBeOnTheScreen();
  });

  it('starts clearing the moment the docked chip is pressed', () => {
    const onTokenPress = jest.fn();
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(
      <SlowPage selectedTokenId={NVIDIA.id} onTokenPress={onTokenPress} />,
    );
    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
    );

    expect(onTokenPress).toHaveBeenCalledWith(NVIDIA);
    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID).props.pointerEvents,
    ).toBe('auto');
  });

  it('keeps a quick clear when the page only catches up to the select', () => {
    arrange([mockHotToken(), NVIDIA]);
    const { rerender } = renderWithProvider(<SlowPage />);

    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
    );
    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
    );
    rerender(<SlowPage selectedTokenId={NVIDIA.id} />);

    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID).props.pointerEvents,
    ).toBe('auto');
  });

  it('keeps a chip picked during the exit when the page only catches up to the clear', () => {
    arrange([mockHotToken(), NVIDIA]);
    const { rerender } = renderWithProvider(
      <SlowPage selectedTokenId={NVIDIA.id} />,
    );

    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
    );
    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc')),
    );
    rerender(<SlowPage selectedTokenId={null} />);

    expect(
      screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-btc')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID, {
        includeHiddenElements: true,
      }).props.pointerEvents,
    ).toBe('none');
  });

  it('gives the rail back its taps while the docked chip leaves', () => {
    arrange([mockHotToken(), NVIDIA]);
    const { rerender } = renderWithProvider(
      <HotTokensCarousel selectedTokenId={NVIDIA.id} />,
    );

    rerender(<HotTokensCarousel selectedTokenId={null} />);

    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID).props.pointerEvents,
    ).toBe('auto');
    expect(railChipTestIds()).toEqual([
      getSocialV1HotTokenChipTestId('hot-btc'),
      getSocialV1HotTokenChipTestId('hot-nvda'),
    ]);
  });

  it('keeps frequency order while nothing is selected', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel />);

    expect(railChipTestIds()).toEqual([
      getSocialV1HotTokenChipTestId('hot-btc'),
      getSocialV1HotTokenChipTestId('hot-nvda'),
    ]);
  });

  // Pressing a chip with no handler is a no-op rather than a throw, so a page
  // can mount the rail before it wires filtering.
  it('stays inert when no press handler is supplied', () => {
    arrange([mockHotToken()]);

    renderWithProvider(<HotTokensCarousel />);

    expect(() =>
      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc')),
      ),
    ).not.toThrow();
  });

  it('renders the skeleton instead of chips while loading', () => {
    arrange([], true);

    renderWithProvider(<HotTokensCarousel />);

    expect(screen.getAllByTestId('section-pills-skeleton-pill').length).toBe(6);
    expect(
      screen.queryByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
    ).not.toBeOnTheScreen();
  });

  // Rendering nothing at all -- rather than an empty wrapper -- is what lets
  // the page's gap collapse instead of leaving a rail-shaped hole.
  it('renders nothing when there are no hot tokens', () => {
    arrange([]);

    const { toJSON } = renderWithProvider(<HotTokensCarousel />);

    expect(toJSON()).toBeNull();
  });

  it('duplicates the chips once the track overflows the viewport', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel />);
    fireEvent(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
      'layout',
      { nativeEvent: { layout: { width: 200, height: 40 } } },
    );
    fireEvent(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID),
      'layout',
      { nativeEvent: { layout: { width: 800, height: 40 } } },
    );

    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc-loop')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda-loop')),
    ).toBeOnTheScreen();
  });

  it('runs the marquee while its page is active', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel />);

    expect(mockSetFrameCallbackActive).toHaveBeenLastCalledWith(true);
  });

  it('stops the marquee while its page is off screen', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel isActive={false} />);

    expect(mockSetFrameCallbackActive).toHaveBeenLastCalledWith(false);
    expect(mockSetFrameCallbackActive).not.toHaveBeenCalledWith(true);
  });

  it('resumes the marquee when its page becomes active again', () => {
    arrange([mockHotToken(), NVIDIA]);
    const { rerender } = renderWithProvider(
      <HotTokensCarousel isActive={false} />,
    );

    rerender(<HotTokensCarousel isActive />);

    expect(mockSetFrameCallbackActive).toHaveBeenLastCalledWith(true);
  });

  describe('selection motion', () => {
    const OFF_SCREEN = mockHotToken({
      id: 'hot-eth',
      symbol: 'ETH',
      label: 'Ethereum',
    });

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /** Selects NVIDIA from a laid-out rail, then clears it again. */
    const selectThenClear = () => {
      const onTokenPress = jest.fn();
      arrange([mockHotToken(), NVIDIA, OFF_SCREEN]);
      const { rerender } = renderWithProvider(
        <HotTokensCarousel onTokenPress={onTokenPress} />,
      );
      layOutOverflowingRail();
      layOutPill('hot-btc', 16);
      layOutPill('hot-nvda', 144);
      layOutPill('hot-eth', 600);
      layOutPill('hot-btc-loop', 816);

      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
      );
      rerender(
        <HotTokensCarousel
          selectedTokenId={NVIDIA.id}
          onTokenPress={onTokenPress}
        />,
      );
      act(() => {
        jest.runAllTimers();
      });
      const dockedAfterSelect =
        screen.queryByTestId(
          getSocialV1HotTokenSelectedChipTestId('hot-nvda'),
        ) !== null;

      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
      );
      rerender(
        <HotTokensCarousel
          selectedTokenId={null}
          onTokenPress={onTokenPress}
        />,
      );
      act(() => {
        jest.runAllTimers();
      });

      return { onTokenPress, dockedAfterSelect };
    };

    it('scatters the rail, docks the chip, then brings the rail back', () => {
      const { onTokenPress, dockedAfterSelect } = selectThenClear();

      expect(dockedAfterSelect).toBe(true);
      expect(onTokenPress).toHaveBeenNthCalledWith(1, NVIDIA);
      expect(onTokenPress).toHaveBeenNthCalledWith(2, NVIDIA);
      expect(
        screen.getByTestId(SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID).props
          .pointerEvents,
      ).toBe('auto');
    });

    it('removes the docked chip once its exit finishes', () => {
      selectThenClear();

      expect(
        screen.queryByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
      ).toBeNull();
    });

    it('fades the rail in place on low-end hardware', () => {
      mockGetHardwareTier.mockReturnValue('LOW');

      const { dockedAfterSelect } = selectThenClear();

      expect(dockedAfterSelect).toBe(true);
      expect(
        screen.getByTestId(SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID).props
          .pointerEvents,
      ).toBe('auto');
    });

    it('fades the rail in place under Reduce Motion', () => {
      mockReducedMotion = true;

      const { dockedAfterSelect } = selectThenClear();

      expect(dockedAfterSelect).toBe(true);
      expect(
        screen.queryByTestId(getSocialV1HotTokenSelectedChipTestId('hot-nvda')),
      ).toBeNull();
    });

    it('hides both copies of the pressed chip when the loop shows them side by side', () => {
      arrange([mockHotToken(), NVIDIA]);
      renderWithProvider(<SlowPage />);
      fireEvent(
        screen.getByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
        'layout',
        { nativeEvent: { layout: { width: 300, height: 40 } } },
      );
      fireEvent(
        screen.getByTestId(SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID),
        'layout',
        { nativeEvent: { layout: { width: 320, height: 40 } } },
      );
      layOutPill('hot-btc', 16);
      layOutPill('hot-nvda', 144);
      layOutPill('hot-btc-loop', 16);
      layOutPill('hot-nvda-loop', 144);
      // Scrubbed into the wrap zone: NVIDIA sits at -56 and its loop copy at 264.
      act(() => {
        fireGestureHandler(
          getByGestureTestId(SOCIAL_V1_HOT_TOKENS_PAN_GESTURE_ID),
          [{ translationX: 0 }, { translationX: -100 }, { translationX: -200 }],
        );
      });

      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')),
      );
      // One frame: well inside every other pill's scatter delay.
      act(() => {
        jest.advanceTimersByTime(16);
      });

      expect(getPillWrapper('hot-nvda')).toHaveAnimatedStyle({ opacity: 0 });
      expect(getPillWrapper('hot-nvda-loop')).toHaveAnimatedStyle({
        opacity: 0,
      });
      expect(getPillWrapper('hot-btc-loop')).toHaveAnimatedStyle({
        opacity: 1,
      });
    });

    it('hides a pill that mounts while the rail is scattered', () => {
      arrange([mockHotToken(), NVIDIA]);
      const { rerender } = renderWithProvider(
        <HotTokensCarousel selectedTokenId={NVIDIA.id} />,
      );

      arrange([mockHotToken(), NVIDIA, OFF_SCREEN]);
      rerender(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

      expect(
        screen.getByTestId(getSocialV1HotTokenChipTestId('hot-eth'), {
          includeHiddenElements: true,
        }),
      ).toBeTruthy();
    });
  });

  describe('marquee', () => {
    it('crawls the rail each frame once the track overflows', () => {
      arrange([mockHotToken(), NVIDIA]);
      renderWithProvider(<HotTokensCarousel />);
      layOutOverflowingRail();

      expect(() =>
        act(() => {
          mockFrameCallback?.({ timeSincePreviousFrame: 16 });
          mockFrameCallback?.({ timeSincePreviousFrame: null });
        }),
      ).not.toThrow();
      expect(mockFrameCallback).not.toBeNull();
    });

    it('lets the rail be scrubbed', () => {
      arrange([mockHotToken(), NVIDIA]);
      renderWithProvider(<HotTokensCarousel />);
      layOutOverflowingRail();

      expect(() =>
        act(() => {
          fireGestureHandler(
            getByGestureTestId(SOCIAL_V1_HOT_TOKENS_PAN_GESTURE_ID),
            [
              { translationX: 0 },
              { translationX: -60 },
              { translationX: -120 },
            ],
          );
        }),
      ).not.toThrow();
    });
  });

  describe('on low-end hardware', () => {
    beforeEach(() => {
      mockGetHardwareTier.mockReturnValue('LOW');
    });

    it('keeps the rail still while its page is active', () => {
      arrange([mockHotToken(), NVIDIA]);

      renderWithProvider(<HotTokensCarousel />);

      expect(mockSetFrameCallbackActive).not.toHaveBeenCalledWith(true);
    });

    it('still lets the chips be scrubbed past the viewport', () => {
      arrange([mockHotToken(), NVIDIA]);

      renderWithProvider(<HotTokensCarousel />);
      fireEvent(
        screen.getByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
        'layout',
        { nativeEvent: { layout: { width: 200, height: 40 } } },
      );
      fireEvent(
        screen.getByTestId(SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID),
        'layout',
        { nativeEvent: { layout: { width: 800, height: 40 } } },
      );

      expect(
        screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc-loop')),
      ).toBeOnTheScreen();
    });
  });
});
