import React from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { merge } from 'lodash';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { IndividualFiatDisplay, TotalFiatDisplay } from './FiatDisplay';
import { mockNetworkState } from '../../../../util/test/network';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { FIAT_UNAVAILABLE, FiatAmount } from '../types';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockStateWithTestnet = merge({}, mockInitialState, {
  engine: {
    backgroundState: {
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.SEPOLIA,
          id: 'sepolia',
          nickname: 'Sepolia',
          ticker: 'ETH',
        }),
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
  beforeEach(() => {
    jest.resetAllMocks();
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'USD';
    });
  });

  describe('IndividualFiatDisplay', () => {
    it.each([
      [FIAT_UNAVAILABLE, 'Not Available'],
      [new BigNumber(100), '$100'],
      [new BigNumber(-100), '$100'],
      [new BigNumber(-100.5), '$100.50'],
    ])('when fiatAmount is %s it renders %s', (fiatAmount, expected) => {
      const { queryByText } = renderWithProvider(
        <IndividualFiatDisplay fiatAmount={fiatAmount as FiatAmount} />,
        { state: mockStateWithShowingFiatOnTestnets },
      );
      expect(queryByText(expected)).toBeTruthy();
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
      [[new BigNumber(100), new BigNumber(200), FIAT_UNAVAILABLE, new BigNumber(300)], 'Total = $600'],
      [[new BigNumber(-100), new BigNumber(-200), FIAT_UNAVAILABLE, new BigNumber(-300.2)], 'Total = $600.20'],
    ])('when fiatAmounts is %s it renders %s', (fiatAmounts, expected) => {
      const { queryByText } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={fiatAmounts as FiatAmount[]} />,
        { state: mockStateWithShowingFiatOnTestnets },
      );

      expect(queryByText(expected)).toBeTruthy();
    });

    it('does not render anything if hideFiatForTestnet is true', () => {
      const mockFiatAmounts = [
        new BigNumber(100),
        new BigNumber(200),
        new BigNumber(300)] as unknown as FiatAmount[];

      const { queryByText } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={mockFiatAmounts} />,
        { state: mockStateWithHidingFiatOnTestnets },
      );
      expect(queryByText('600')).toBe(null);
    });
  });
});
