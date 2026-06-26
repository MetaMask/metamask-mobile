import React from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsTemplateFrame,
  ActivityDetailsWebviewButton,
} from '../../components';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuse Predict UI utilities until shared predict utilities are extracted. */
import {
  formatCurrencyValue,
  formatPositionSize,
  formatPrice,
} from '../../../../UI/Predict/utils/format';
/* eslint-enable import-x/no-restricted-paths */
import {
  getPredictActivity,
  type PredictActivityListItem,
} from './PredictDetails.types';
import {
  ClaimWinningsBreakdown,
  PredictHero,
  PredictMarketContext,
  StatusAndDateRows,
} from './PredictDetailsShared';
import { getPolymarketActivityUrl } from './PredictDetails.utils';
import { useOpenPredictHome } from './useOpenPredictHome';

export function PredictProviderActivityDetails({
  item,
}: {
  item: PredictActivityListItem;
}) {
  const activity = getPredictActivity(item);
  const openPredictHome = useOpenPredictHome();

  if (!activity) {
    return null;
  }

  const { entry } = activity;
  const isBuy = entry.type === 'buy';
  const isSell = entry.type === 'sell';
  const amount = formatCurrencyValue(entry.amount, { showSign: !isBuy });
  const netPnlNumeric = isSell ? activity.netPnlUsd : undefined;
  const hasNetPnl = typeof netPnlNumeric === 'number';
  const netPnlValue = hasNetPnl
    ? formatCurrencyValue(netPnlNumeric, { showSign: true })
    : undefined;
  const isNegativeNetPnl =
    typeof netPnlNumeric === 'number' && netPnlNumeric < 0;
  const shares =
    'price' in entry && entry.price
      ? formatPositionSize(entry.amount / entry.price)
      : undefined;
  const price =
    'price' in entry
      ? formatPrice(entry.price, {
          minimumDecimals: entry.price >= 1 ? 2 : 4,
          maximumDecimals: entry.price >= 1 ? 2 : 4,
        })
      : undefined;
  const isClaim = entry.type === 'claimWinnings';
  const heroAmount = isClaim ? amount : undefined;

  const claimTotalAmount = isClaim
    ? formatCurrencyValue(activity.totalNetPnlUsd ?? entry.amount, {
        showSign: true,
      })
    : undefined;
  const claimMarketAmount = isClaim
    ? formatCurrencyValue(activity.netPnlUsd ?? entry.amount, {
        showSign: true,
      })
    : undefined;
  const polymarketUrl = getPolymarketActivityUrl(activity);

  return (
    <ActivityDetailsTemplateFrame
      hero={
        heroAmount ? (
          <PredictHero amount={heroAmount} isPositive showTokenIcon />
        ) : undefined
      }
      metadata={
        <ActivityDetailSection>
          {isBuy || isSell ? (
            <PredictMarketContext
              icon={activity.icon}
              outcome={activity.outcome}
              title={activity.title}
            />
          ) : null}
          <StatusAndDateRows item={item} />
          {!isBuy && !isSell ? null : (
            <>
              <ActivityDetailRow
                label={strings('predict.transactions.predicted_amount')}
                value={isBuy ? amount : undefined}
              />
              <ActivityDetailRow
                label={
                  isSell
                    ? strings('predict.transactions.shares_sold')
                    : strings('predict.transactions.shares_bought')
                }
                value={shares}
              />
              <ActivityDetailRow
                label={strings('predict.transactions.price_per_share')}
                value={price}
              />
            </>
          )}
        </ActivityDetailSection>
      }
      details={
        isClaim ? (
          <ClaimWinningsBreakdown
            totalAmount={claimTotalAmount}
            marketAmount={claimMarketAmount}
            title={activity.title}
          />
        ) : isSell && hasNetPnl ? (
          <ActivityDetailSection>
            <ActivityDetailRow
              label={strings('predict.transactions.net_pnl')}
              value={
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={
                    isNegativeNetPnl
                      ? TextColor.ErrorDefault
                      : TextColor.SuccessDefault
                  }
                >
                  {netPnlValue}
                </Text>
              }
            />
          </ActivityDetailSection>
        ) : undefined
      }
      footer={
        <>
          {isBuy || isSell ? (
            <>
              <ActivityDetailsWebviewButton
                label={strings('predict.transactions.view_on_polymarket')}
                title="Polymarket"
                url={polymarketUrl}
              />
              <ActivityDetailsDoItAgainButton
                label={strings('predict.transactions.place_another_prediction')}
                onPress={openPredictHome}
              />
            </>
          ) : null}
        </>
      }
    />
  );
}
