import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BannerAlertSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsCrossMarginRatioBanner from './PerpsCrossMarginRatioBanner';
import { PerpsCrossMarginRatioBannerSelectorsIDs } from './PerpsCrossMarginRatioBanner.testIds';

const descriptionFor = (ratio: string) =>
  strings('perps.crossMarginRatio.description', { ratio });

describe('PerpsCrossMarginRatioBanner', () => {
  it('renders a warning banner for an elevated ratio', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="63%"
        severity={BannerAlertSeverity.Warning}
      />,
    );

    expect(screen.getByText(descriptionFor('63%'))).toBeOnTheScreen();
  });

  it('renders a danger banner for a critical ratio', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="89%"
        severity={BannerAlertSeverity.Danger}
      />,
    );

    expect(screen.getByText(descriptionFor('89%'))).toBeOnTheScreen();
  });

  it.each([
    [BannerAlertSeverity.Warning, 'description_hidden_warning'],
    [BannerAlertSeverity.Danger, 'description_hidden_danger'],
  ] as const)(
    'describes a %s ratio without the figure while it is hidden',
    (severity, key) => {
      render(
        <PerpsCrossMarginRatioBanner
          ratio="89%"
          severity={severity}
          isRatioHidden
        />,
      );

      expect(
        screen.getByText(strings(`perps.crossMarginRatio.${key}`)),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/89%/u)).not.toBeOnTheScreen();
    },
  );

  it('renders with the default container test ID', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="89%"
        severity={BannerAlertSeverity.Danger}
      />,
    );

    expect(
      screen.getByTestId(PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('uses a custom test ID when provided', () => {
    render(
      <PerpsCrossMarginRatioBanner
        ratio="12%"
        severity={BannerAlertSeverity.Warning}
        testID="custom-banner"
      />,
    );

    expect(screen.getByTestId('custom-banner')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
