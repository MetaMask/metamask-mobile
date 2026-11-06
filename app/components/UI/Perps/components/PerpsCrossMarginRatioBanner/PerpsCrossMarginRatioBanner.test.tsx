import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsCrossMarginRatioBanner from './PerpsCrossMarginRatioBanner';
import { PerpsCrossMarginRatioBannerSelectorsIDs } from './PerpsCrossMarginRatioBanner.testIds';

describe('PerpsCrossMarginRatioBanner', () => {
  it('renders the ratio in the description', () => {
    render(<PerpsCrossMarginRatioBanner ratio="89%" />);

    expect(screen.getByText('Cross margin ratio is 89%.')).toBeTruthy();
  });

  it('renders with the default container test ID', () => {
    render(<PerpsCrossMarginRatioBanner ratio="89%" />);

    expect(
      screen.getByTestId(PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER),
    ).toBeTruthy();
  });

  it('uses a custom test ID when provided', () => {
    render(<PerpsCrossMarginRatioBanner ratio="12%" testID="custom-banner" />);

    expect(screen.getByTestId('custom-banner')).toBeTruthy();
    expect(
      screen.queryByTestId(PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
