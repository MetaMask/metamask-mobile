import React from 'react';
import useFiatFormatter from './useFiatFormatter';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

import { IndividualFiatDisplay, TotalFiatDisplay } from './FiatDisplay';
import { FIAT_UNAVAILABLE } from '../types';

jest.mock('./useFiatFormatter');
(useFiatFormatter as jest.Mock).mockReturnValue((value: number) => `$${value}`);

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('IndividualFiatDisplay', () => {
  it.each([
    [FIAT_UNAVAILABLE, 'Not Available'],
    [100, '$100'],
    [-100, '$100'],
  ])('when fiatAmount is %s it renders %s', (fiatAmount, expected) => {
    const { getByText } = renderWithProvider(
      <IndividualFiatDisplay fiatAmount={fiatAmount} />,
      { state: mockInitialState },
    );
    expect(getByText(expected)).toBeDefined();
  });
});

describe('TotalFiatDisplay', () => {
  it.each([
    [[FIAT_UNAVAILABLE, FIAT_UNAVAILABLE], 'Not Available'],
    [[], 'Not Available'],
    [[100, 200, FIAT_UNAVAILABLE, 300], 'Total = $600'],
    [[-100, -200, FIAT_UNAVAILABLE, -300], 'Total = $600'],
  ])('when fiatAmounts is %s it renders %s', (fiatAmounts, expected) => {
    const { getByText } = renderWithProvider(
      <TotalFiatDisplay fiatAmounts={fiatAmounts} />,
      { state: mockInitialState },
    );
    expect(getByText(expected)).toBeDefined();
  });
});
