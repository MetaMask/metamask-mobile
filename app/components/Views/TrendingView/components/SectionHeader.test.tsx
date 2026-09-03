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
