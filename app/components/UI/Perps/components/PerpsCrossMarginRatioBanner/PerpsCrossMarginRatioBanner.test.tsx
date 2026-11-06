import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BannerAlertSeverity } from '@metamask/design-system-react-native';
import PerpsCrossMarginRatioBanner from './PerpsCrossMarginRatioBanner';
import { PerpsCrossMarginRatioBannerSelectorsIDs } from './PerpsCrossMarginRatioBanner.testIds';

describe('PerpsCrossMarginRatioBanner', () => {
  it('renders a warning banner for an elevated ratio', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="63%"
        severity={BannerAlertSeverity.Warning}
      />,
    );

    expect(screen.getByText('Cross margin ratio is 63%.')).toBeTruthy();
  });

  it('renders a danger banner for a critical ratio', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="89%"
        severity={BannerAlertSeverity.Danger}
      />,
    );

    expect(screen.getByText('Cross margin ratio is 89%.')).toBeTruthy();
  });

  it('renders with the default container test ID', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="89%"
        severity={BannerAlertSeverity.Danger}
      />,
    );

    expect(
      screen.getByTestId(PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER),
    ).toBeTruthy();
  });

  it('uses a custom test ID when provided', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="12%"
        severity={BannerAlertSeverity.Warning}
        testID="custom-banner"
      />,
    );

    expect(screen.getByTestId('custom-banner')).toBeTruthy();
    expect(
      screen.queryByTestId(PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
