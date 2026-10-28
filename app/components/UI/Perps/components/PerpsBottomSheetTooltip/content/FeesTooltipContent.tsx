import { type PerpsFeeDiscountKind } from '../../../utils/feeDiscount';
import React from 'react';
import { Image, View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { TooltipContentProps } from './types';
import createStyles from './FeesTooltipContent.styles';
import { formatFeeRate } from '../../../hooks/usePerpsOrderFees';
import VipIcon from '../../../../../../images/rewards/vip.svg';
import foxIcon from '../../../../../../images/fox.png';
import MembershipVipBadge from '../../../../shared/MembershipVipBadge/MembershipVipBadge';
import SealPercentIcon, {
  SEAL_PERCENT_ICON_SIZE,
} from '../../PerpsFeesDisplay/SealPercentIcon';
import { PerpsFeeDiscountLabelSelectorsIDs } from '../../../Perps.testIds';
import {
  BannerBase,
  Box,
  BoxBackgroundColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface FeesTooltipContentProps extends TooltipContentProps {
  data?: {
    metamaskFeeRate?: number;
    protocolFeeRate?: number;
    originalMetamaskFeeRate?: number;
    feeDiscountPercentage?: number;
    feeDiscountKind?: PerpsFeeDiscountKind;
    bridgeFeeFormatted?: string;
  };
}

const DISCOUNT_MESSAGE_BY_KIND = {
  member: 'perps.tooltips.fees.member_discount_message',
  vip: 'perps.tooltips.fees.discount_message',
  promotional: 'perps.tooltips.fees.promotional_discount_message',
  generic: 'perps.tooltips.fees.fee_discount_message',
} as const satisfies Record<PerpsFeeDiscountKind, string>;

const FeesTooltipContent = ({ testID, data }: FeesTooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  const metamaskFee = formatFeeRate(data?.metamaskFeeRate);
  const providerFee = formatFeeRate(data?.protocolFeeRate);
  const originalFee = formatFeeRate(data?.originalMetamaskFeeRate);
  const discountPercentage = data?.feeDiscountPercentage;

  const hasDiscount =
    discountPercentage !== undefined && discountPercentage > 0;
  const isMemberDiscount = hasDiscount && data?.feeDiscountKind === 'member';
  const isVipDiscount = hasDiscount && data?.feeDiscountKind === 'vip';
  const isPromotionalDiscount =
    hasDiscount && data?.feeDiscountKind === 'promotional';
  const discountMessage = data?.feeDiscountKind
    ? DISCOUNT_MESSAGE_BY_KIND[data.feeDiscountKind]
    : DISCOUNT_MESSAGE_BY_KIND.generic;

  return (
    <View testID={testID}>
      {isPromotionalDiscount && discountPercentage !== undefined ? (
        <Box twClassName="mb-3">
          <BannerBase
            backgroundColor={BoxBackgroundColor.BackgroundMuted}
            twClassName="gap-2"
            startAccessory={
              <SealPercentIcon
                size={SEAL_PERCENT_ICON_SIZE.banner}
                testID={PerpsFeeDiscountLabelSelectorsIDs.LABEL}
              />
            }
            title={strings(discountMessage, {
              percentage: discountPercentage.toString(),
            })}
            titleProps={{ color: TextColor.TextDefault }}
          />
        </Box>
      ) : null}
      {hasDiscount && !isPromotionalDiscount ? (
        <View style={styles.discountBanner}>
          {isMemberDiscount && (
            <Image
              source={foxIcon}
              style={styles.memberIcon}
              resizeMode="contain"
            />
          )}
          {isVipDiscount && <VipIcon name="VipIcon" width={14} height={14} />}
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings(discountMessage, {
              percentage: discountPercentage.toString(),
            })}
          </Text>
        </View>
      ) : null}

      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.metamask_fee')}
        </Text>
        <View style={styles.feeValueContainer}>
          {(isMemberDiscount || isVipDiscount) && (
            <MembershipVipBadge hasProEntitlement={isMemberDiscount} />
          )}
          {hasDiscount && (
            <Text
              variant={TextVariant.BodyMd}
              color={
                isPromotionalDiscount
                  ? TextColor.TextAlternative
                  : TextColor.TextMuted
              }
              style={styles.strikethroughText}
              accessibilityLabel={
                isPromotionalDiscount
                  ? strings('perps.tooltips.fees.original_fee_value', {
                      fee: originalFee,
                    })
                  : undefined
              }
            >
              {originalFee}
            </Text>
          )}
          <Text
            variant={TextVariant.BodyMd}
            color={
              isPromotionalDiscount
                ? TextColor.SuccessDefault
                : TextColor.TextAlternative
            }
          >
            {metamaskFee}
          </Text>
        </View>
      </View>

      <View style={styles.feeRow}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.tooltips.fees.provider_fee')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={
            isPromotionalDiscount
              ? TextColor.TextDefault
              : TextColor.TextAlternative
          }
        >
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
