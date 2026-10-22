import React from 'react';
import { View } from 'react-native';
import type { PerpsFeeSource } from '@metamask/perps-controller';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';
import { formatFeeRate } from '../../../hooks/usePerpsOrderFees';
import VipIcon from '../../../../../../images/rewards/vip.svg';
import MembershipVipBadge from '../../../../shared/MembershipVipBadge/MembershipVipBadge';
import {
  BannerBase,
  BoxBackgroundColor,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import PerpsOrangeChip from '../../PerpsOrangeChip';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../../utils/formatUtils';

interface FeesTooltipContentProps extends TooltipContentProps {
  data?: {
    metamaskFeeRate?: number;
    protocolFeeRate?: number;
    originalMetamaskFeeRate?: number;
    feeDiscountPercentage?: number;
    /**
     * Winning source of the fee resolution. Only picks the badge and saving
     * message variant shown when `feeDiscountPercentage` is positive:
     * `subscription` shows the Orange variant, anything else the VIP one.
     */
    feeSource?: PerpsFeeSource;
    bridgeFeeFormatted?: string;
    /** Order notional (USD) the fees are quoted for. */
    orderNotionalUsd?: number;
    /**
     * Free notional (USD) the subscription has left, from the quote. With
     * `orderNotionalUsd` it lets the Orange banner say how much it covers.
     */
    subscriptionRemainingNotionalUsd?: number;
  };
}

const formatUsd = (value: number) =>
  formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW });

/**
 * Copy for the Orange banner. Full cover when the MetaMask fee is fully
 * discounted or the free notional reaches the order size; partial cover
 * names the dollar split when the quote reports what is left; otherwise the
 * discount percentage.
 */
const getOrangeBannerMessage = ({
  discountPercentage,
  orderNotionalUsd,
  remainingNotionalUsd,
}: {
  discountPercentage: number;
  orderNotionalUsd?: number;
  remainingNotionalUsd?: number;
}) => {
  const hasNotional =
    orderNotionalUsd !== undefined &&
    Number.isFinite(orderNotionalUsd) &&
    orderNotionalUsd > 0;
  const hasRemaining =
    remainingNotionalUsd !== undefined && Number.isFinite(remainingNotionalUsd);

  if (
    discountPercentage >= 100 ||
    (hasNotional && hasRemaining && remainingNotionalUsd >= orderNotionalUsd)
  ) {
    return strings('perps.tooltips.fees.orange_covers_full');
  }

  if (hasNotional && hasRemaining && remainingNotionalUsd > 0) {
    return strings('perps.tooltips.fees.orange_covers_partial', {
      covered: formatUsd(Math.min(remainingNotionalUsd, orderNotionalUsd)),
      notional: formatUsd(orderNotionalUsd),
    });
  }

  return strings('perps.tooltips.fees.member_discount_message', {
    percentage: discountPercentage.toString(),
  });
};

const FeesTooltipContent = ({
  testID,
  data,
  onOpenNestedInfo,
}: FeesTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  const metamaskFee = formatFeeRate(data?.metamaskFeeRate);
  const providerFee = formatFeeRate(data?.protocolFeeRate);
  const originalFee = formatFeeRate(data?.originalMetamaskFeeRate);
  const discountPercentage = data?.feeDiscountPercentage;

  const hasDiscount =
    discountPercentage !== undefined && discountPercentage > 0;
  const isSubscriptionDiscount = data?.feeSource === 'subscription';

  return (
    <View testID={testID}>
      {hasDiscount && isSubscriptionDiscount ? (
        <BannerBase
          testID={`${testID}-orange-banner`}
          description={getOrangeBannerMessage({
            discountPercentage,
            orderNotionalUsd: data?.orderNotionalUsd,
            remainingNotionalUsd: data?.subscriptionRemainingNotionalUsd,
          })}
          descriptionProps={{ color: TextColor.TextAlternative }}
          // The muted surface the neutral Tag and the VIP banner use; the
          // default background would match the sheet and disappear.
          backgroundColor={BoxBackgroundColor.BackgroundMuted}
          twClassName="mb-3"
        />
      ) : null}
      {hasDiscount && !isSubscriptionDiscount ? (
        <View style={styles.discountBanner}>
          <VipIcon name="VipIcon" width={14} height={14} />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.tooltips.fees.discount_message', {
              percentage: discountPercentage.toString(),
            })}
          </Text>
        </View>
      ) : null}

      <View style={styles.feeRow}>
        <View style={styles.feeValueContainer}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.tooltips.fees.metamask_fee')}
          </Text>
          {hasDiscount && isSubscriptionDiscount ? (
            <>
              <PerpsOrangeChip testID={`${testID}-orange-chip`} />
              {onOpenNestedInfo ? (
                <ButtonIcon
                  iconName={IconName.Info}
                  size={ButtonIconSize.Xs}
                  iconProps={{ color: IconColor.IconAlternative }}
                  onPress={() => onOpenNestedInfo('orange_fees')}
                  accessibilityLabel={strings(
                    'perps.tooltips.orange_fees.title',
                  )}
                  testID={`${testID}-orange-info`}
                />
              ) : null}
            </>
          ) : null}
        </View>
        <View style={styles.feeValueContainer}>
          {hasDiscount && !isSubscriptionDiscount ? (
            <MembershipVipBadge />
          ) : null}
          {hasDiscount && (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextMuted}
              style={styles.strikethroughText}
            >
              {originalFee}
            </Text>
          )}
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {metamaskFee}
          </Text>
        </View>
      </View>

      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.provider_fee')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {providerFee}
        </Text>
      </View>

      {data?.bridgeFeeFormatted ? (
        <View style={styles.feeRow}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.tooltips.fees.bridge_fee')}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {data.bridgeFeeFormatted}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default FeesTooltipContent;
