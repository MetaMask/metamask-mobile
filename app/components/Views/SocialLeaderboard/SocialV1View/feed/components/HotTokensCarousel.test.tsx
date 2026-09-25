import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useSocialV1HotTokens } from '../hooks/useSocialV1HotTokens';
import { mockHotToken } from '../mocks/socialV1HotTokens.mock';
import type { SocialV1HotToken } from '../types';
import HotTokensCarousel from './HotTokensCarousel';
import {
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

  it('marks the selected asset chip', () => {
    arrange([mockHotToken(), NVIDIA]);

    renderWithProvider(<HotTokensCarousel selectedTokenId={NVIDIA.id} />);

    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-nvda')).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('hot-btc')).props
        .accessibilityState,
    ).toEqual({ selected: false });
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
