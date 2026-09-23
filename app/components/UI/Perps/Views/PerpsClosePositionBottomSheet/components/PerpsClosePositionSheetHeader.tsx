import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import PerpsTokenLogo from '../../../components/PerpsTokenLogo';
import LivePriceHeader from '../../../components/LivePriceDisplay/LivePriceHeader';

export interface PerpsClosePositionSheetHeaderProps {
  symbol: string;
  isLong: boolean;
  /** Position leverage; omitted when the venue reports none. */
  leverage?: number;
  currentPrice: number;
  /** Market or Limit, already localized for both the label and the a11y name. */
  orderTypeLabel: string;
  /** Hidden entirely when the close-position limit order flag is off. */
  isOrderTypeToggleVisible: boolean;
  isOrderTypeToggleDisabled: boolean;
  onOrderTypeToggle: () => void;
}

/**
 * Sheet header: asset logo, direction and leverage, live price, and the
 * Market/Limit control.
 */
const PerpsClosePositionSheetHeader: React.FC<
  PerpsClosePositionSheetHeaderProps
> = ({
  symbol,
  isLong,
  leverage,
  currentPrice,
  orderTypeLabel,
  isOrderTypeToggleVisible,
  isOrderTypeToggleDisabled,
  onOrderTypeToggle,
}) => (
  <Box twClassName="flex-row items-center gap-3 px-4 pt-4 pb-4">
    <PerpsTokenLogo symbol={symbol} size={32} />

    <Box twClassName="flex-1 min-w-0">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.HeadingSm}
          twClassName="shrink"
          numberOfLines={1}
          testID={PerpsClosePositionBottomSheetSelectorsIDs.HEADER_TITLE}
        >
          {isLong
            ? strings('perps.close_position.sheet_title_long', {
                asset: getPerpsDisplaySymbol(symbol),
              })
            : strings('perps.close_position.sheet_title_short', {
                asset: getPerpsDisplaySymbol(symbol),
              })}
        </Text>
        {leverage ? (
          <Tag
            severity={TagSeverity.Neutral}
            twClassName="self-center"
            testID={PerpsClosePositionBottomSheetSelectorsIDs.HEADER_LEVERAGE}
          >
            {`${leverage}x`}
          </Tag>
        ) : null}
      </Box>

      <LivePriceHeader
        symbol={symbol}
        currentPrice={currentPrice}
        testIDPrice={PerpsClosePositionBottomSheetSelectorsIDs.HEADER_PRICE}
        testIDChange={PerpsClosePositionBottomSheetSelectorsIDs.HEADER_CHANGE}
      />
    </Box>

    {isOrderTypeToggleVisible ? (
      <SelectButton
        testID={PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_BUTTON}
        variant={SelectButtonVariant.Primary}
        size={SelectButtonSize.Md}
        placeholder={orderTypeLabel}
        value={orderTypeLabel}
        accessibilityLabel={strings(
          'perps.close_position.order_type_accessibility_label',
          { orderType: orderTypeLabel },
        )}
        isDisabled={isOrderTypeToggleDisabled}
        onPress={onOrderTypeToggle}
        hideEndArrow
        twClassName="rounded-lg"
        endAccessory={
          <Icon
            name={IconName.SwapHorizontal}
            size={IconSize.Sm}
            color={IconColor.IconDefault}
          />
        }
      />
    ) : null}
  </Box>
);

export default PerpsClosePositionSheetHeader;
