import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import useHideFiatForTestnet from '../../../hooks/useHideFiatForTestnet';
import { FIAT_UNAVAILABLE } from '../types';
import { IndividualFiatDisplay, TotalFiatDisplay } from './FiatDisplay';
import useFiatFormatter from './useFiatFormatter';

jest.mock('./useFiatFormatter');
jest.mock('../../../hooks/useHideFiatForTestnet');

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('FiatDisplay', () => {
  const mockUseHideFiatForTestnet = jest.mocked(useHideFiatForTestnet);
  const mockUseFiatFormatter = jest.mocked(useFiatFormatter);

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseHideFiatForTestnet.mockReturnValue(false);
    mockUseFiatFormatter.mockReturnValue((value: number) => `$${value}`);
  });

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

    it('does not render anything if hideFiatForTestnet is true', () => {
      mockUseHideFiatForTestnet.mockReturnValue(true);
      const { queryByText } = renderWithProvider(
        <IndividualFiatDisplay fiatAmount={100} />,
        { state: mockInitialState },
      );
      expect(queryByText('100')).toBe(null);
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

    it('does not render anything if hideFiatForTestnet is true', () => {
      mockUseHideFiatForTestnet.mockReturnValue(true);
      const { queryByText } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={[100, 200, 300]} />,
        { state: mockInitialState },
      );
      expect(queryByText('600')).toBe(null);
    });
  });
});
