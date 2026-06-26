import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Image } from 'expo-image';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { ActivityDetailsPerpsHero } from './ActivityDetailsPerpsHero';

const mockGetIconUrls = jest.fn();
jest.mock('./ActivityDetailsPerps.utils', () => ({
  ...jest.requireActual('./ActivityDetailsPerps.utils'),
  getPerpsAssetIconUrls: (...args: unknown[]) => mockGetIconUrls(...args),
}));

const URLS = {
  primary: 'https://img/primary.svg',
  fallback: 'https://img/fallback.svg',
};

describe('ActivityDetailsPerpsHero', () => {
  beforeEach(() => {
    mockGetIconUrls.mockReset();
    mockGetIconUrls.mockReturnValue(URLS);
  });

  it('renders nothing without an amount', () => {
    const { queryByTestId } = renderWithProvider(
      <ActivityDetailsPerpsHero amount={undefined} isPositive symbol="BTC" />,
    );
    expect(queryByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER)).toBeNull();
  });

  it('renders the amount (no icon) when the symbol is missing', () => {
    const { getByText, getByTestId, UNSAFE_queryByType } = renderWithProvider(
      <ActivityDetailsPerpsHero
        amount="+$100"
        isPositive={false}
        symbol={undefined}
      />,
    );
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(getByText('+$100')).toBeOnTheScreen();
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });

  it('renders the primary asset image when icon urls resolve', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <ActivityDetailsPerpsHero amount="+$1" isPositive symbol="BTC" />,
    );
    expect(UNSAFE_getByType(Image).props.source).toEqual({ uri: URLS.primary });
  });

  it('switches to the fallback url, then hides the image, on successive errors', () => {
    const { UNSAFE_getByType, UNSAFE_queryByType } = renderWithProvider(
      <ActivityDetailsPerpsHero amount="+$1" isPositive symbol="BTC" />,
    );

    fireEvent(UNSAFE_getByType(Image), 'error');
    expect(UNSAFE_getByType(Image).props.source).toEqual({
      uri: URLS.fallback,
    });

    fireEvent(UNSAFE_getByType(Image), 'error');
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });

  it('shows the fallback avatar (no image) when icon urls are unavailable', () => {
    mockGetIconUrls.mockReturnValue(null);
    const { getByTestId, UNSAFE_queryByType } = renderWithProvider(
      <ActivityDetailsPerpsHero amount="+$1" isPositive symbol="ETH" />,
    );
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });
});
