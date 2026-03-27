import React from 'react';
import { render } from '@testing-library/react-native';

import TronErrorsBanner from './TronErrorsBanner';

describe('TronErrorsBanner', () => {
  it('renders one bullet point per error message', () => {
    const { getByText } = render(
      <TronErrorsBanner
        messages={[
          'Fiat conversion for rewards is temporarily unavailable.',
          'Estimated annual rewards are temporarily unavailable.',
        ]}
      />,
    );

    expect(
      getByText('Fiat conversion for rewards is temporarily unavailable.'),
    ).toBeDefined();
    expect(
      getByText('Estimated annual rewards are temporarily unavailable.'),
    ).toBeDefined();
  });
});
