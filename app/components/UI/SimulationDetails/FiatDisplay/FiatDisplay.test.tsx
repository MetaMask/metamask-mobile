import React from 'react';
import BigNumber from 'bignumber.js';
import { merge } from 'lodash';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  IndividualFiatDisplay,
  TotalFiatDisplay,
  calculateTotalFiatValue,
} from './FiatDisplay';
import { mockNetworkState } from '../../../../util/test/network';
import { FIAT_UNAVAILABLE, FiatAmount } from '../types';

const mockStateWithTestnet = merge(
  {
    engine: {
      backgroundState,
    },
  },
  {
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency: 'USD',
        },
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
    settings: {
      showFiatOnTestnets: true,
    },
  },
);

const mockStateWithHideFiatOnTestnets = merge({}, mockStateWithTestnet, {
  settings: {
    showFiatOnTestnets: false,
  },
});

describe('FiatDisplay', () => {
  describe('IndividualFiatDisplay', () => {
    it.each([
      [new BigNumber(100), '$100'],
      [new BigNumber(-100), '$100'],
      [new BigNumber(-100.5), '$100.50'],
      [new BigNumber('987543219876543219876.54321'), '$987,543,219,87...'],
    ])('when fiatAmount is %s it renders %s', async (fiatAmount, expected) => {
      const { findByText } = renderWithProvider(
        <IndividualFiatDisplay fiatAmount={fiatAmount as BigNumber} />,
        { state: mockStateWithTestnet },
      );
      expect(await findByText(expected)).toBeTruthy();
    });

    it('returns null when fiatAmount is FIAT_UNAVAILABLE', () => {
      const { toJSON } = renderWithProvider(
        <IndividualFiatDisplay fiatAmount={FIAT_UNAVAILABLE} />,
        { state: mockStateWithTestnet },
      );
      expect(toJSON()).toBeNull();
    });

    it('does not render anything if hideFiatForTestnet is true', () => {
      const { queryByText } = renderWithProvider(
        <IndividualFiatDisplay fiatAmount={100} />,
        { state: mockStateWithHideFiatOnTestnets },
      );
      expect(queryByText('100')).toBe(null);
    });
  });

  describe('TotalFiatDisplay', () => {
    it.each([
      [
        [
          new BigNumber(100),
          new BigNumber(200),
          FIAT_UNAVAILABLE,
          new BigNumber(300),
        ],
        'Total = $600',
      ],
      [
        [
          new BigNumber(-100),
          new BigNumber(-200),
          FIAT_UNAVAILABLE,
          new BigNumber(-300.2),
        ],
        'Total = $600.20',
      ],
      [
        [
          new BigNumber(new BigNumber('987543219876543219876.54321')),
          new BigNumber(-200),
          FIAT_UNAVAILABLE,
          new BigNumber(-300.2),
        ],
        'Total = $987,543,219,876,543,219,376.34',
      ],
    ])(
      'when fiatAmounts is %s it renders %s',
      async (fiatAmounts, expected) => {
        const { findByText } = renderWithProvider(
          <TotalFiatDisplay fiatAmounts={fiatAmounts as FiatAmount[]} />,
          { state: mockStateWithTestnet },
        );

        expect(await findByText(expected)).toBeTruthy();
      },
    );

    it('returns null when all fiatAmounts are FIAT_UNAVAILABLE', () => {
      const { toJSON } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={[FIAT_UNAVAILABLE, FIAT_UNAVAILABLE]} />,
        { state: mockStateWithTestnet },
      );
      expect(toJSON()).toBeNull();
    });

    it('returns null when fiatAmounts is empty', () => {
      const { toJSON } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={[]} />,
        { state: mockStateWithTestnet },
      );
      expect(toJSON()).toBeNull();
    });

    it('does not render anything if hideFiatForTestnet is true', () => {
      const mockFiatAmounts = [
        new BigNumber(100),
        new BigNumber(200),
        new BigNumber(300),
      ] as unknown as FiatAmount[];

      const { queryByText } = renderWithProvider(
        <TotalFiatDisplay fiatAmounts={mockFiatAmounts} />,
        { state: mockStateWithHideFiatOnTestnets },
      );
      expect(queryByText('600')).toBe(null);
    });
  });

  describe('calculateTotalFiatValue', () => {
    it('returns null when all fiat amounts are FIAT_UNAVAILABLE', () => {
      const fiatAmounts = [
        FIAT_UNAVAILABLE,
        FIAT_UNAVAILABLE,
        FIAT_UNAVAILABLE,
      ];

      const result = calculateTotalFiatValue(fiatAmounts);

      expect(result).toBeNull();
    });

    it('returns null when array is empty', () => {
      const fiatAmounts: FiatAmount[] = [];

      const result = calculateTotalFiatValue(fiatAmounts);

      expect(result).toBeNull();
    });

    it('returns total when at least one fiat amount is available', () => {
      const fiatAmounts = [
        new BigNumber(100),
        FIAT_UNAVAILABLE,
        new BigNumber(200),
      ] as unknown as FiatAmount[];

      const result = calculateTotalFiatValue(fiatAmounts);

      expect(result).not.toBeNull();
      expect(result?.toNumber()).toBe(300);
    });

    it('returns total when all fiat amounts are available', () => {
      const fiatAmounts = [
        new BigNumber(100),
        new BigNumber(200),
        new BigNumber(300),
      ] as unknown as FiatAmount[];

      const result = calculateTotalFiatValue(fiatAmounts);

      expect(result).not.toBeNull();
      expect(result?.toNumber()).toBe(600);
    });

    it('returns total with single FIAT_UNAVAILABLE in array', () => {
      const fiatAmounts = [FIAT_UNAVAILABLE] as FiatAmount[];

      const result = calculateTotalFiatValue(fiatAmounts);

      expect(result).toBeNull();
    });

    it('returns total with single available amount', () => {
      const fiatAmounts = [new BigNumber(500)] as unknown as FiatAmount[];

      const result = calculateTotalFiatValue(fiatAmounts);

      expect(result).not.toBeNull();
      expect(result?.toNumber()).toBe(500);
    });
  });
});
