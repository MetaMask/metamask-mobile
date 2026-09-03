import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  ActivityDetailsFeeRows,
  ActivityDetailsTotalRow,
  ActivityDetailsFeesAndTotal,
} from './ActivityDetailsFees';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { useActivityAmountsFiat } from '../hooks/useActivityAmountsFiat';

jest.mock('../hooks/useActivityAmountsFiat', () => ({
  useActivityAmountsFiat: jest.fn(),
}));

const useFiatMock = jest.mocked(useActivityAmountsFiat);
const { FEE_ROW, TOTAL_ROW } = ActivityDetailsSelectorsIDs;

const itemWithToken = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0x1',
  data: {
    from: '0xf',
    to: '0xt',
    token: { amount: '1000000', decimals: 6, symbol: 'USDC', direction: 'out' },
  },
} as ActivityListItem;

const itemWithoutToken = {
  ...itemWithToken,
  data: { from: '0xf', to: '0xt' },
} as ActivityListItem;

const feeRow = {
  label: 'Network fee',
  value: '$1',
  fee: { type: 'base' as const },
};

describe('ActivityDetailsFees', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('ActivityDetailsFeeRows', () => {
    it('renders a row per fee', () => {
      useFiatMock.mockReturnValue({ feeRows: [feeRow], totalFiat: '$2' });

      const { getByTestId, getByText } = renderWithProvider(
        <ActivityDetailsFeeRows item={itemWithToken} />,
      );

      expect(getByTestId(FEE_ROW)).toBeOnTheScreen();
      expect(getByText('Network fee')).toBeOnTheScreen();
    });

    it('renders nothing when there are no fees', () => {
      useFiatMock.mockReturnValue({ feeRows: [], totalFiat: undefined });

      const { queryByTestId } = renderWithProvider(
        <ActivityDetailsFeeRows item={itemWithToken} />,
      );

      expect(queryByTestId(FEE_ROW)).toBeNull();
    });
  });

  describe('ActivityDetailsTotalRow', () => {
    it('prefers the fiat total', () => {
      useFiatMock.mockReturnValue({ feeRows: [], totalFiat: '$5' });

      const { getByTestId, getByText } = renderWithProvider(
        <ActivityDetailsTotalRow item={itemWithToken} />,
      );

      expect(getByTestId(TOTAL_ROW)).toBeOnTheScreen();
      expect(getByText('$5')).toBeOnTheScreen();
    });

    it('falls back to the token amount when no fiat is available', () => {
      useFiatMock.mockReturnValue({ feeRows: [], totalFiat: undefined });

      const { getByTestId } = renderWithProvider(
        <ActivityDetailsTotalRow item={itemWithToken} />,
      );

      expect(getByTestId(TOTAL_ROW)).toBeOnTheScreen();
    });

    it('renders nothing in fiat-only mode without a fiat total', () => {
      useFiatMock.mockReturnValue({ feeRows: [], totalFiat: undefined });

      const { queryByTestId } = renderWithProvider(
        <ActivityDetailsTotalRow item={itemWithToken} fiatOnly />,
      );

      expect(queryByTestId(TOTAL_ROW)).toBeNull();
    });
  });

  describe('ActivityDetailsFeesAndTotal', () => {
    it('renders fee rows and the total together', () => {
      useFiatMock.mockReturnValue({ feeRows: [feeRow], totalFiat: '$5' });

      const { getByTestId } = renderWithProvider(
        <ActivityDetailsFeesAndTotal item={itemWithToken} />,
      );

      expect(getByTestId(FEE_ROW)).toBeOnTheScreen();
      expect(getByTestId(TOTAL_ROW)).toBeOnTheScreen();
    });

    it('renders nothing when there are no fees and no total', () => {
      useFiatMock.mockReturnValue({ feeRows: [], totalFiat: undefined });

      const { queryByTestId } = renderWithProvider(
        <ActivityDetailsFeesAndTotal item={itemWithoutToken} />,
      );

      expect(queryByTestId(FEE_ROW)).toBeNull();
      expect(queryByTestId(TOTAL_ROW)).toBeNull();
    });
  });
});
