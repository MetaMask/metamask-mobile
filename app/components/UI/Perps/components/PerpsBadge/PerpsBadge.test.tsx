import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsBadge from './PerpsBadge';
import type { BadgeType } from './PerpsBadge.types';

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      badge: {},
      badgeText: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const labels: Record<string, string> = {
      'perps.market.badge.experimental': 'Experimental',
      'perps.market.badge.crypto': 'Crypto',
      'perps.market.badge.equity': 'Equity',
      'perps.market.badge.commodity': 'Commodity',
      'perps.market.badge.forex': 'Forex',
    };
    return labels[key] || key;
  },
}));

describe('PerpsBadge', () => {
  it('renders correct i18n label for each badge type', () => {
    const badgeTypes: BadgeType[] = [
      'experimental',
      'crypto',
      'equity',
      'commodity',
      'forex',
    ];
    const expectedLabels = [
      'Experimental',
      'Crypto',
      'Equity',
      'Commodity',
      'Forex',
    ];

    badgeTypes.forEach((type, index) => {
      const { getByText, unmount } = render(<PerpsBadge type={type} />);

      expect(getByText(expectedLabels[index])).toBeOnTheScreen();
      unmount();
    });
  });

  it('renders badge with custom label when provided', () => {
    // Arrange
    const customLabel = 'Custom Badge Label';

    // Act
    const { getByText } = render(
      <PerpsBadge type="experimental" customLabel={customLabel} />,
    );

    // Assert
    expect(getByText(customLabel)).toBeTruthy();
  });

  it('renders badge with testID when provided', () => {
    // Arrange
    const testID = 'perps-badge-test';

    // Act
    const { getByTestId } = render(
      <PerpsBadge type="experimental" testID={testID} />,
    );

    // Assert
    expect(getByTestId(testID)).toBeTruthy();
  });
});
