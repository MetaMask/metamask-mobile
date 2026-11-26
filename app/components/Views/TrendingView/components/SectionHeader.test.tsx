import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SectionHeader from './SectionHeader';
import { trackExploreSectionSeeAll } from '../search/analytics';

jest.mock('../search/analytics', () => ({
  trackExploreSectionSeeAll: jest.fn(),
}));

describe('TrendingView SectionHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([false, true])(
    'leaves the homepage 20px content gap when interactive is %s',
    (interactive) => {
      const { getByTestId } = render(
        <SectionHeader
          title="Predictions"
          testID="header"
          onViewAll={interactive ? jest.fn() : undefined}
        />,
      );

      expect(getByTestId('header')).toHaveStyle({ paddingBottom: 20 });
    },
  );

  it.each([
    [2, 12],
    [3, 8],
  ] as const)(
    'accounts for content with a %s-token top inset',
    (contentTopInset, paddingBottom) => {
      const { getByTestId } = render(
        <SectionHeader
          title="Trending tokens"
          testID="header"
          contentTopInset={contentTopInset}
        />,
      );

      expect(getByTestId('header')).toHaveStyle({ paddingBottom });
      expect(paddingBottom + contentTopInset * 4).toBe(20);
    },
  );

  it('preserves subtitle hierarchy and spaces content below the subtitle', () => {
    const { getByTestId, getByText } = render(
      <SectionHeader
        title="Ecosystems"
        subtitle="Explore sites across networks"
        testID="header"
      />,
    );

    expect(getByTestId('header')).toHaveStyle({ paddingBottom: 4 });
    expect(getByText('Explore sites across networks')).toHaveStyle({
      paddingBottom: 20,
    });
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <SectionHeader
        title="Ecosystems"
        subtitle="Explore dApps across chains"
        testID="section-header-ecosystems"
      />,
    );

    expect(getByText('Ecosystems')).toBeOnTheScreen();
    expect(getByText('Explore dApps across chains')).toBeOnTheScreen();
  });

  it('tracks analytics and calls onViewAll when interactive', () => {
    const onViewAll = jest.fn();
    const { getByTestId } = render(
      <SectionHeader
        title="Popular"
        onViewAll={onViewAll}
        testID="section-header-popular"
        tabName="Sites"
        sectionName="sites_popular"
      />,
    );

    fireEvent.press(getByTestId('section-header-popular'));
    expect(trackExploreSectionSeeAll).toHaveBeenCalledWith({
      tabName: 'Sites',
      sectionName: 'sites_popular',
    });
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});
