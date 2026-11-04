import React, { useMemo, type ReactNode } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PredictMarket, PredictOutcome } from '../../types';
import { formatAskPrice, getAskPricePercent } from '../shared/formatting';
import { isOutcomeTradeable } from '../shared/tradeable';
import { OutcomeRow } from '../shared/ui';
import {
  ChoiceMarketGroupCardTestIds,
  type ChoiceMarketGroupCardTestIdSet,
} from './ChoiceMarketGroupCard.testIds';
import { MarketCard } from './internal/MarketCard';

/** How one row of a choice card looks. */
export interface ChoiceRowAppearance {
  label: string;
  color: string;
  /** Shown before the label, such as a Team logo. */
  leading?: ReactNode;
}

export interface ChoiceMarketGroupCardProps {
  groupKey: string;
  /** The Markets of one `choice` group, one row each. */
  markets: readonly PredictMarket[];
  /** The card's title, such as a Player's name; none under a section header. */
  title?: string;
  describeRow: (
    market: PredictMarket,
    yes: PredictOutcome,
  ) => ChoiceRowAppearance;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
  testIds?: ChoiceMarketGroupCardTestIdSet;
}

interface ChoiceRow {
  market: PredictMarket;
  yes: PredictOutcome;
}

/** Rows in the order received; the layout projection already sorted them. */
const toRows = (markets: readonly PredictMarket[]): ChoiceRow[] =>
  markets.flatMap((market) => {
    const yes = market.outcomes.find((outcome) => outcome.side === 'yes');
    return yes ? [{ market, yes }] : [];
  });

/**
 * A card of rows, one per Market of a `choice` group, each priced by its yes
 * side: a moneyline's options or a Player's thresholds. Every row shows.
 */
export const ChoiceMarketGroupCard = React.memo(
  ({
    groupKey,
    markets,
    title,
    describeRow,
    onOrder,
    testIds = ChoiceMarketGroupCardTestIds,
  }: ChoiceMarketGroupCardProps) => {
    const rows = useMemo(() => toRows(markets), [markets]);

    if (rows.length === 0) {
      return null;
    }

    return (
      <MarketCard.Root testID={testIds.card(groupKey)}>
        {title ? (
          <MarketCard.Title
            testID={ChoiceMarketGroupCardTestIds.title(groupKey)}
          >
            {title}
          </MarketCard.Title>
        ) : null}
        <Box twClassName="gap-3">
          {rows.map(({ market, yes }) => {
            const { label, color, leading } = describeRow(market, yes);
            const price = formatAskPrice(yes.askPrice);

            return (
              <OutcomeRow.Root
                key={market.id}
                testID={testIds.row(groupKey, market.id)}
              >
                {leading}
                <OutcomeRow.Label
                  label={label}
                  percent={getAskPricePercent(yes.askPrice)}
                  color={color}
                  lineTestID={testIds.line(groupKey, market.id)}
                />
                <OutcomeRow.Price
                  price={price}
                  color={color}
                  isDisabled={!isOutcomeTradeable(market, yes)}
                  onPress={() => onOrder?.(market, yes)}
                  accessibilityLabel={strings(
                    'predict.market_groups.choice_accessibility_label',
                    {
                      option: label,
                      price:
                        price ??
                        strings('predict.market_groups.price_unavailable'),
                    },
                  )}
                  testID={testIds.price(groupKey, market.id)}
                />
              </OutcomeRow.Root>
            );
          })}
        </Box>
      </MarketCard.Root>
    );
  },
);

ChoiceMarketGroupCard.displayName = 'ChoiceMarketGroupCard';
