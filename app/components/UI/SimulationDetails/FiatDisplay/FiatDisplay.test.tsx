import React from 'react';
import { merge } from 'lodash';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

import { IndividualFiatDisplay, TotalFiatDisplay } from './FiatDisplay';
import { FIAT_UNAVAILABLE } from '../types';
import useFiatFormatter from './useFiatFormatter';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';

jest.mock('./useFiatFormatter');

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockStateWithTestnet = merge({}, mockInitialState, {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          chainId: NETWORKS_CHAIN_ID.SEPOLIA,
        },
      },
    },
  },
});

const mockStateWithShowingFiatOnTestnets = merge({}, mockStateWithTestnet, {
  engine: {
    backgroundState: {
      PreferencesController: {
        showFiatInTestnets: true,
      },
    },
  },
});

const mockStateWithHidingFiatOnTestnets = merge({}, mockStateWithTestnet, {
  engine: {
    backgroundState: {
      PreferencesController: {
        showFiatInTestnets: false,
      },
    },
  },
});

describe('FiatDisplay', () => {
  const mockUseFiatFormatter = jest.mocked(useFiatFormatter);

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseFiatFormatter.mockReturnValue((value: number) => `$${value}`);
  });

  describe('IndividualFiatDisplay', () => {
    it.each([
      [FIAT_UNAVAILABLE, 'Not Available'],
      [100, '$100'],
      [-100, '$100'],
    ])('when fiatAmount is %s it renders %s', (fiatAmount, expected) => {
      const { queryByText } = renderWithProvider(
        <IndividualFiatDisplay fiatAmount={fiatAmount} />,
        { state: mockStateWithShowingFiatOnTestnets },
      );
      expect(queryByText(expected)).toBeDefined();
    });

    it('does not render anything if hideFiatForTestnet is true', () => {
      const { queryByText } = renderWithProvider(
        <IndividualFiatDisplay fiatAmount={100} />,
        { state: mockStateWithHidingFiatOnTestnets },
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
      const { queryByText } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={fiatAmounts} />,
        { state: mockStateWithShowingFiatOnTestnets },
      );
      expect(queryByText(expected)).toBeDefined();
    });

    it('does not render anything if hideFiatForTestnet is true', () => {
      const { queryByText } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={[100, 200, 300]} />,
        { state: mockStateWithHidingFiatOnTestnets },
      );
      expect(queryByText('600')).toBe(null);
    });
  });
});
