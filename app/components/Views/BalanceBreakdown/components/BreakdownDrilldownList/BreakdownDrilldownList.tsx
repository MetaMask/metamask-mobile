import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useFormatters } from '../../../../hooks/useFormatters';
import { formatPercentage } from '../../../../UI/Predict/utils/format';
import { strings } from '../../../../../../locales/i18n';
import i18n from '../../../../../../locales/i18n';
import type { DrilldownRow, SliceData, HeroData } from '../../types';
import { BalanceBreakdownTestIds } from '../../BalanceBreakdown.testIds';
import BreakdownListItem from '../BreakdownListItem/BreakdownListItem';
import { breakdownDrilldownListStyles } from './BreakdownDrilldownList.styles';
import { getFormattedPercentageChange } from '../../../../../component-library/components-temp/Price/AggregatedPercentage/utils';

interface Props {
  slice: SliceData;
  hero: HeroData;
}

function formatSignedFiat(
  amount: number,
  currency: string,
  formatCurrency: (v: number, c: string) => string,
): string {
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

function rowSecondaryParts(
  row: DrilldownRow,
  currency: string,
  formatCurrency: (v: number, c: string) => string,
): { line?: string; tone: 'positive' | 'negative' | 'neutral' } {
  if (
    row.pricePercentChange1d !== undefined &&
    row.pricePercentChange1d !== null &&
    Number.isFinite(row.pricePercentChange1d)
  ) {
    /** Same numeric convention as `BalanceChangeResult.percentChange` / `AccountGroupBalanceChange`. */
    const v = row.pricePercentChange1d;
    const line = getFormattedPercentageChange(v, i18n.locale)
      .replace(/^\(|\)$/g, '')
      .trim();
    const tone: 'positive' | 'negative' | 'neutral' =
      v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral';
    return { line, tone };
  }

  if (!row.delta) {
    return { tone: 'neutral' };
  }
  const tone: 'positive' | 'negative' | 'neutral' =
    row.delta.amount > 0
      ? 'positive'
      : row.delta.amount < 0
        ? 'negative'
        : 'neutral';

  if (row.pnlPercentPoints !== undefined) {
    return {
      line: `${formatSignedFiat(row.delta.amount, currency, formatCurrency)} (${formatPercentage(row.pnlPercentPoints)})`,
      tone,
    };
  }

  return {
    line: formatSignedFiat(row.delta.amount, currency, formatCurrency),
    tone,
  };
}

const BreakdownDrilldownList: React.FC<Props> = ({ slice, hero }) => {
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);

  const isLoading = slice.status === 'loading';

  const rowsWithMeta = useMemo(
    () =>
      slice.drilldown.map((row) => {
        const secondary = rowSecondaryParts(row, hero.userCurrency, formatCurrency);
        return { row, secondary };
      }),
    [slice.drilldown, hero.userCurrency, formatCurrency],
  );

  if (isLoading) {
    return (
      <Box testID={BalanceBreakdownTestIds.DRILLDOWN_LIST}>
        {[1, 2, 3].map((i) => (
          <Box key={i} paddingVertical={2} twClassName="h-11">
            <Skeleton
              hideChildren={false}
              style={breakdownDrilldownListStyles.loadingRowSkeleton}
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (slice.status === 'error') {
    return (
      <Box
        paddingVertical={4}
        alignItems={BoxAlignItems.Center}
        testID={BalanceBreakdownTestIds.DRILLDOWN_LIST}
      >
        <Text color={TextColor.ErrorDefault} variant={TextVariant.BodyMd}>
          Failed to load data. Pull to refresh.
        </Text>
      </Box>
    );
  }

  if (slice.drilldown.length === 0) {
    const emptyKey =
      slice.key === 'tokens'
        ? 'balance_breakdown.drilldown_empty_tokens'
        : 'balance_breakdown.drilldown_empty_positions';
    return (
      <Box
        paddingVertical={4}
        alignItems={BoxAlignItems.Center}
        testID={BalanceBreakdownTestIds.DRILLDOWN_LIST}
      >
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
          {strings(emptyKey)}
        </Text>
      </Box>
    );
  }

  return (
    <Box testID={BalanceBreakdownTestIds.DRILLDOWN_LIST} gap={2}>
      {rowsWithMeta.map(({ row, secondary }) => (
        <BreakdownListItem
          key={row.key}
          testID={BalanceBreakdownTestIds.DRILLDOWN_ROW(row.key)}
          progressBarColor={slice.color}
          title={row.label}
          subtitle={row.sublabel}
          sensitiveSubtitle={Boolean(row.titleAvatar)}
          primaryValue={formatCurrency(row.valueFiat, hero.userCurrency)}
          secondaryLine={secondary.line}
          secondaryTone={secondary.tone}
          titleAvatar={row.titleAvatar}
          progress={row.progressFraction}
          privacyMode={privacyMode}
        />
      ))}
    </Box>
  );
};

export default BreakdownDrilldownList;
