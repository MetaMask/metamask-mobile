import React from 'react';
import { render } from '@testing-library/react-native';

import TronErrorsBanner, { TronErrorsBannerTestIds } from './TronErrorsBanner';

describe('TronErrorsBanner', () => {
  it('renders each error message in a single banner', () => {
    const { getByText, getByTestId } = render(
      <TronErrorsBanner
        messages={[
          'Fiat conversion for rewards is temporarily unavailable.',
          'Estimated annual rewards are temporarily unavailable.',
        ]}
      />,
    );

    expect(getByTestId(TronErrorsBannerTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText('Fiat conversion for rewards is temporarily unavailable.'),
    ).toBeDefined();
    expect(
      getByText('Estimated annual rewards are temporarily unavailable.'),
    ).toBeDefined();
  });
});
