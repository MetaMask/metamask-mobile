import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  selectMoneyAccountPlusSubscription,
  selectSubscriptionBenefits,
} from '../../../../../../selectors/subscriptionController';
import { mapPlusBenefitsToTradeAllowances } from '../../../../../Views/ProHub/components/MemberPricingOnTrades/mapPlusBenefitsToTradeAllowances';
import { TRADE_ALLOWANCE_IDS } from '../../../../../Views/ProHub/ProHub.constants';
import { formatSubscriptionPeriodEnd } from '../../../../../Views/ProHub/ProHub.utils';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../../utils/formatUtils';
import { TooltipContentProps } from './types';

const formatUsd = (value: number) =>
  formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW });

/**
 * Explains the Orange fee benefit. Opened from the info icon beside the
 * Orange chip on the fees breakdown.
 *
 * The allowance and what is left of it come from the subscription benefits
 * snapshot Pro Hub reads, and the reset date from the subscription's current
 * period end. Each part only shows when that data is there.
 */
const OrangeFeesTooltipContent = ({ testID }: TooltipContentProps) => {
  const benefits = useSelector(selectSubscriptionBenefits);
  const subscription = useSelector(selectMoneyAccountPlusSubscription);

  const perpsAllowance = mapPlusBenefitsToTradeAllowances(benefits).find(
    (item) => item.id === TRADE_ALLOWANCE_IDS.PERPS,
  );
  const resetsOn = formatSubscriptionPeriodEnd(subscription?.currentPeriodEnd);

  const body = perpsAllowance
    ? strings('perps.tooltips.orange_fees.content_with_allowance', {
        allowance: formatUsd(perpsAllowance.allowance),
      })
    : strings('perps.tooltips.orange_fees.content');
  const remaining =
    perpsAllowance && resetsOn
      ? strings('perps.tooltips.orange_fees.remaining', {
          amount: formatUsd(
            Math.max(0, perpsAllowance.allowance - perpsAllowance.used),
          ),
          date: resetsOn,
        })
      : undefined;

  return (
    <Box testID={testID} gap={3}>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {body}
      </Text>
      {remaining ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={`${testID}-remaining`}
        >
          {remaining}
        </Text>
      ) : null}
    </Box>
  );
};

export default OrangeFeesTooltipContent;
