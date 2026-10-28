import { fireEvent, screen } from '@testing-library/react-native';
import {
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { mockHotToken } from '../mocks/socialV1HotTokens.mock';
import type { SocialV1HotToken } from '../types';
import HotTokensCarouselView, {
  type HotTokensCarouselProps,
} from './HotTokensCarousel';
import {
  getSocialV1HotTokenCloseTestId,
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID,
} from './HotTokensCarousel.testIds';

jest.mock('../../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => null),
}));

const mockSetFrameCallbackActive = jest.fn();

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === 'useFrameCallback') {
        return () => ({
          setActive: mockSetFrameCallbackActive,
          isActive: false,
          callbackId: 1,
        });
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

describe('HotTokensCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHardwareTier.mockReturnValue(null);
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
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc')),
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
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-pump')),
    ).toBeOnTheScreen();
  });

  it('marks the selected asset chip', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      screen.queryByTestId(getSocialV1HotTokenChipTestId('hot-btc')),
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

  it('hides unselected chips while a chip is selected', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    expect(railChipTestIds()).toEqual([
      getSocialV1HotTokenChipTestId('hot-nvda'),
    ]);
    expect(
      screen.queryByTestId(getSocialV1HotTokenChipTestId('hot-btc')),
    ).toBeNull();
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
