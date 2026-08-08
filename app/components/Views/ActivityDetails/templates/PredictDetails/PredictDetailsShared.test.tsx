import React from 'react';
import { Image } from 'expo-image';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ActivityDetailsSelectorsIDs } from '../../ActivityDetails.testIds';
import {
  ClaimWinningsBreakdown,
  PredictHero,
  PredictMarketContext,
  StatusAndDateRows,
} from './PredictDetailsShared';
import type { PredictActivityListItem } from './PredictDetails.types';

describe('PredictDetailsShared', () => {
  describe('PredictHero', () => {
    it('renders nothing without an amount', () => {
      const { queryByTestId } = renderWithProvider(
        <PredictHero amount={undefined} isPositive />,
      );
      expect(
        queryByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
      ).toBeNull();
    });

    it('renders the USDC token icon when showTokenIcon is set', () => {
      const { getByText, getByTestId, UNSAFE_queryByType } = renderWithProvider(
        <PredictHero amount="+$1,000" isPositive showTokenIcon />,
      );
      expect(
        getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
      ).toBeOnTheScreen();
      expect(getByText('+$1,000')).toBeOnTheScreen();
      // showTokenIcon path uses the SVG, not the remote <Image>
      expect(UNSAFE_queryByType(Image)).toBeNull();
    });

    it('renders the avatar branch (no token icon) when an icon is provided', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <PredictHero amount="$10" isPositive={false} icon="https://x/y.png" />,
      );
      expect(
        getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
      ).toBeOnTheScreen();
      expect(getByText('$10')).toBeOnTheScreen();
    });

    it('renders the avatar fallback (no image) when no icon is provided', () => {
      const { getByTestId, UNSAFE_queryByType } = renderWithProvider(
        <PredictHero amount="$10" isPositive />,
      );
      expect(
        getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
      ).toBeOnTheScreen();
      expect(UNSAFE_queryByType(Image)).toBeNull();
    });
  });

  describe('PredictMarketContext', () => {
    it('renders outcome, icon and title when all present', () => {
      const { getByText, UNSAFE_getByType } = renderWithProvider(
        <PredictMarketContext
          icon="https://x/y.png"
          outcome="Yes"
          title="Will it rain?"
        />,
      );
      expect(
        getByText(strings('predict.transactions.you_predicted')),
      ).toBeOnTheScreen();
      expect(getByText('Yes')).toBeOnTheScreen();
      expect(getByText('Will it rain?')).toBeOnTheScreen();
      expect(UNSAFE_getByType(Image)).toBeTruthy();
    });

    it('omits the outcome chip and image when not provided', () => {
      const { queryByText, UNSAFE_queryByType } = renderWithProvider(
        <PredictMarketContext title="No outcome" />,
      );
      expect(
        queryByText(strings('predict.transactions.you_predicted')),
      ).toBeOnTheScreen();
      expect(queryByText('Yes')).toBeNull();
      expect(UNSAFE_queryByType(Image)).toBeNull();
    });
  });

  describe('ClaimWinningsBreakdown', () => {
    it('renders nothing without a total amount', () => {
      const { queryByText } = renderWithProvider(
        <ClaimWinningsBreakdown totalAmount={undefined} title="x" />,
      );
      expect(
        queryByText(strings('predict.transactions.total_net_pnl')),
      ).toBeNull();
    });

    it('renders only the total row when there is no title', () => {
      const { getByText, queryByText } = renderWithProvider(
        <ClaimWinningsBreakdown totalAmount="+$5.49" />,
      );
      expect(
        getByText(strings('predict.transactions.total_net_pnl')),
      ).toBeOnTheScreen();
      expect(queryByText('•')).toBeNull();
    });

    it('renders the total and the distinct per-market payout row', () => {
      const { getByText } = renderWithProvider(
        <ClaimWinningsBreakdown
          totalAmount="+$12.50"
          marketAmount="+$4.25"
          title="Market X"
        />,
      );
      expect(getByText('+$12.50')).toBeOnTheScreen();
      expect(getByText('•')).toBeOnTheScreen();
      expect(getByText('Market X')).toBeOnTheScreen();
      expect(getByText('+$4.25')).toBeOnTheScreen();
    });
  });

  describe('StatusAndDateRows', () => {
    it('renders the status and date rows', () => {
      const item = {
        type: 'predictionPlaced',
        status: 'success',
        timestamp: 1_765_361_640_000,
      } as PredictActivityListItem;
      const { getByTestId } = renderWithProvider(
        <StatusAndDateRows item={item} />,
      );
      expect(
        getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ActivityDetailsSelectorsIDs.DATE_ROW),
      ).toBeOnTheScreen();
    });
  });
});
