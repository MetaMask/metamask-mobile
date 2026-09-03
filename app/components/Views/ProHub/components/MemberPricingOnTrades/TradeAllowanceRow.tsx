import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { TradeAllowanceItem } from '../../ProHub.constants';
import { MemberPricingOnTradesTestIds } from './MemberPricingOnTrades.testIds';

interface TradeAllowanceRowProps {
  item: TradeAllowanceItem;
}

const formatCurrencyAmount = (amount: number): string =>
  strings('pro_hub.member_pricing.allowance_currency', {
    amount: amount.toLocaleString('en-US'),
  });

const formatAllowanceValue = (item: TradeAllowanceItem): string => {
  if (item.kind === 'currency') {
    return formatCurrencyAmount(item.allowance);
  }

  const countKey =
    item.allowance === 1
      ? 'pro_hub.member_pricing.allowance_count_one'
      : 'pro_hub.member_pricing.allowance_count_other';

  return strings(countKey, { count: item.allowance });
};

const formatUsedValue = (item: TradeAllowanceItem): string => {
  if (item.kind === 'currency') {
    return formatCurrencyAmount(item.used);
  }

  return String(item.used);
};

const calculateProgress = (item: TradeAllowanceItem): number => {
  if (item.allowance <= 0) {
    return 0;
  }

  return Math.min(item.used / item.allowance, 1);
};

const TradeAllowanceRow = ({ item }: TradeAllowanceRowProps) => {
  const progressPercent = useMemo(
    () => Math.round(calculateProgress(item) * 100),
    [item],
  );
  const labelKey = `pro_hub.member_pricing.${item.id}.label`;
  const footnoteKey = `pro_hub.member_pricing.${item.id}.footnote`;
  const label = strings(labelKey);

  return (
    <Box
      twClassName="gap-y-3"
      testID={MemberPricingOnTradesTestIds.ROW(item.id)}
    >
      <Box twClassName="gap-y-2">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyLg} color={TextColor.TextDefault}>
            {label}
          </Text>
          <Box flexDirection={BoxFlexDirection.Row}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {formatUsedValue(item)}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {` / ${formatAllowanceValue(item)}`}
            </Text>
          </Box>
        </Box>

        <Box
          twClassName="h-2 rounded-full bg-muted overflow-hidden"
          testID={MemberPricingOnTradesTestIds.PROGRESS(item.id)}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityValue={{
            min: 0,
            max: item.allowance,
            now: Math.min(item.used, item.allowance),
          }}
        >
          <Box
            twClassName="h-full rounded-full bg-icon-default"
            style={{ width: `${progressPercent}%` }}
            testID={MemberPricingOnTradesTestIds.PROGRESS_FILL(item.id)}
          />
        </Box>
      </Box>

      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {strings(footnoteKey)}
      </Text>
    </Box>
  );
};

export default TradeAllowanceRow;
