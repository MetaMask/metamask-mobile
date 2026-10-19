import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useSocialV1HotTokens } from '../hooks/useSocialV1HotTokens';
import { mockHotToken } from '../mocks/socialV1HotTokens.mock';
import type { SocialV1HotToken } from '../types';
import HotTokensCarousel from './HotTokensCarousel';
import {
  getSocialV1HotTokenCheckTestId,
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
  SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID,
} from './HotTokensCarousel.testIds';

jest.mock('../hooks/useSocialV1HotTokens');

const mockUseSocialV1HotTokens = jest.mocked(useSocialV1HotTokens);

const arrange = (tokens: SocialV1HotToken[], isLoading = false) => {
  mockUseSocialV1HotTokens.mockReturnValue({ tokens, isLoading, error: null });
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

describe('HotTokensCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a chip per hot token', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel />);

    expect(
      screen.getByTestId(SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc')),
    ).toHaveTextContent('Bitcoin perps');
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
      chain: 'solana',
      contractAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
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
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });

  it('checks the selected chip and only that one', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    expect(
      screen.getByTestId(getSocialV1HotTokenCheckTestId('hot-nvda')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getSocialV1HotTokenCheckTestId('hot-btc')),
    ).toBeNull();
  });

  // The rail is parked while a filter is on, so the selected chip has to be the
  // one at the resting left edge rather than wherever frequency put it.
  it('moves the selected chip to the front of the rail', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    expect(railChipTestIds()).toEqual([
      getSocialV1HotTokenChipTestId('hot-nvda'),
      getSocialV1HotTokenChipTestId('hot-btc'),
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
});
