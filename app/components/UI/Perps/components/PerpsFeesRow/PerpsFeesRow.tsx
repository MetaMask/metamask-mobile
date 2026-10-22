import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  Skeleton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PerpsFeeSource } from '@metamask/perps-controller';
import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import PerpsFeesDisplay from '../PerpsFeesDisplay';
import PerpsOrangeChip from '../PerpsOrangeChip';

/** Text sizes for the two places the row appears. */
const SIZE_CONFIG = {
  /** Lite Long/Short sheet: matches the Margin and Liquidation price rows. */
  default: {
    keyVariant: TextVariant.BodySm,
    keyFontWeight: FontWeight.Regular,
    valueVariant: TextVariant.BodyMd,
    /**
     * A plain icon, exactly as the Margin and Liquidation price rows draw it
     * (`Icon`, `IconName.Info`, `IconSize.Sm`, `IconAlternative`, 4px gap).
     * The whole row is the tap target, so no button is needed.
     */
    infoIconSize: undefined,
    rowClassName: 'min-h-10 h-auto px-0',
  },
  /** Sheets whose rows use BodyMd labels, e.g. Reverse position. */
  medium: {
    keyVariant: TextVariant.BodyMd,
    keyFontWeight: FontWeight.Regular,
    valueVariant: TextVariant.BodyMd,
    infoIconSize: undefined,
    rowClassName: 'min-h-10 h-auto px-0',
  },
  /**
   * Full-width summary lists built from KeyValueRow defaults, e.g. the close
   * position sheet's Receive and Included P&L rows.
   */
  summary: {
    keyVariant: TextVariant.BodyMd,
    keyFontWeight: FontWeight.Medium,
    valueVariant: TextVariant.BodyMd,
    infoIconSize: undefined,
    rowClassName: 'min-h-10 h-auto px-4',
  },
  /** Pro order form summary. */
  compact: {
    keyVariant: TextVariant.BodyXs,
    keyFontWeight: FontWeight.Regular,
    valueVariant: TextVariant.BodyXs,
    infoIconSize: ButtonIconSize.Xs,
    rowClassName: 'min-h-6 h-auto px-0',
  },
} as const;

export interface PerpsFeesRowProps {
  /** Total fee in USD the order is charged. Undefined renders `placeholder`. */
  fee?: number;
  /** Total fee in USD before any discount, shown struck through. */
  originalFee?: number;
  /** MetaMask fee discount in whole percentage points. */
  feeDiscountPercentage?: number;
  /** Winning fee source; `subscription` adds the Orange chip to the label. */
  feeSource?: PerpsFeeSource;
  isLoading?: boolean;
  placeholder?: string;
  /**
   * Opens the fee breakdown and makes the whole row pressable. Without it the
   * info icon is shown disabled.
   */
  onInfoPress?: () => void;
  size?: keyof typeof SIZE_CONFIG;
  testID?: string;
  valueTestID?: string;
  infoButtonTestID?: string;
  /** Extra layout classes for the key/value line. */
  twClassName?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fees row shared by the Lite trade sheet and the Pro order form.
 *
 * Shows the total fee in dollars. When a discount applies the undiscounted
 * total is struck through beside it, unless both format the same (e.g. both
 * "<$0.01"). A subscription discount (full or partial) shows an orange plan
 * chip ("Orange") after the label, shaped like the Isolated chip on the Margin
 * row and coloured like the Member badge, in place
 * of the Member badge beside the value; a VIP discount keeps its badge.
 */
const PerpsFeesRow: React.FC<PerpsFeesRowProps> = ({
  fee,
  originalFee,
  feeDiscountPercentage,
  feeSource,
  isLoading = false,
  placeholder = '--',
  onInfoPress,
  size = 'default',
  testID,
  valueTestID,
  infoButtonTestID,
  twClassName,
  style,
}) => {
  const config = SIZE_CONFIG[size];
  const hasDiscount = (feeDiscountPercentage ?? 0) > 0;
  const isMemberWaiver = hasDiscount && feeSource === 'subscription';
  const label = strings('perps.order.fees');
  const feeText =
    fee === undefined
      ? placeholder
      : formatPerpsFiat(fee, { ranges: PRICE_RANGES_MINIMAL_VIEW });
  const formattedOriginalFee =
    hasDiscount &&
    fee !== undefined &&
    originalFee !== undefined &&
    originalFee > fee
      ? formatPerpsFiat(originalFee, { ranges: PRICE_RANGES_MINIMAL_VIEW })
      : undefined;
  // A strike-through that reads the same as the actual fee says nothing.
  const originalFeeText =
    formattedOriginalFee !== feeText ? formattedOriginalFee : undefined;

  const accessibilityLabel = [
    `${label}, `,
    isMemberWaiver
      ? `${strings('perps.fees_row.member_accessibility_label', {
          plan: strings('pro_subscription.pro'),
        })}, `
      : '',
    feeText,
    originalFeeText
      ? `, ${strings('perps.fees_row.was', { fee: originalFeeText })}`
      : '',
    onInfoPress
      ? `. ${strings('perps.fees_row.info_accessibility_label')}`
      : '',
  ].join('');

  // Lite draws a plain icon, exactly as the Margin and Liquidation price rows
  // do; the whole row is the tap target. Pro keeps its own icon button, which
  // stays visible but disabled without a callback, as the Pro form showed it
  // before this row was shared.
  const infoIcon =
    config.infoIconSize === undefined ? (
      <Icon
        name={IconName.Info}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
        testID={infoButtonTestID}
      />
    ) : (
      <ButtonIcon
        iconName={IconName.Info}
        size={config.infoIconSize}
        iconProps={{ color: IconColor.IconAlternative }}
        onPress={onInfoPress}
        isDisabled={!onInfoPress}
        testID={infoButtonTestID}
        accessible={false}
      />
    );
  const memberChipTestID = testID ? `${testID}-member-chip` : undefined;

  const content = (
    <KeyValueRow
      accessible={false}
      keyLabel={label}
      keyTextProps={{
        variant: config.keyVariant,
        fontWeight: config.keyFontWeight,
        color: TextColor.TextAlternative,
      }}
      keyEndAccessory={
        isMemberWaiver ? (
          // Same spacing as "Margin [Isolated] ⓘ": 4px between each item.
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <PerpsOrangeChip testID={memberChipTestID} />
            {infoIcon}
          </Box>
        ) : (
          infoIcon
        )
      }
      value={
        isLoading ? (
          <Skeleton
            testID={valueTestID ? `${valueTestID}-skeleton` : undefined}
            width={64}
            height={20}
          />
        ) : (
          <PerpsFeesDisplay
            fee={fee}
            originalFee={originalFeeText ? originalFee : undefined}
            feeDiscountPercentage={feeDiscountPercentage}
            feeSource={feeSource}
            placeholder={placeholder}
            showBadge={!isMemberWaiver}
            variant={config.valueVariant}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Medium}
            testID={valueTestID}
          />
        )
      }
      twClassName={`${config.rowClassName}${twClassName ? ` ${twClassName}` : ''}`}
      style={style}
    />
  );

  if (!onInfoPress) {
    return (
      <Box
        testID={testID}
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </Box>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onInfoPress}
    >
      {content}
    </Pressable>
  );
};

export default PerpsFeesRow;
