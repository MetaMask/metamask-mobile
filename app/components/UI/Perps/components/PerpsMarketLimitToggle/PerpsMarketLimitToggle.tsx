import React from 'react';
import {
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsSwapIcon from '../PerpsSwapIcon';

interface PerpsMarketLimitToggleProps {
  orderType: 'market' | 'limit';
  isDisabled: boolean;
  onPress: () => void;
  testID: string;
}

/**
 * Shared Market/Limit toggle used by Perps trade bottom sheets.
 */
const PerpsMarketLimitToggle: React.FC<PerpsMarketLimitToggleProps> = ({
  orderType,
  isDisabled,
  onPress,
  testID,
}) => {
  const label =
    orderType === 'market'
      ? strings('perps.order.market')
      : strings('perps.order.limit');

  return (
    <SelectButton
      testID={testID}
      variant={SelectButtonVariant.Primary}
      size={SelectButtonSize.Md}
      placeholder={label}
      value={label}
      accessibilityLabel={strings(
        'perps.trade_sheet.order_type_accessibility_label',
        { orderType: label },
      )}
      isDisabled={isDisabled}
      onPress={onPress}
      hideEndArrow
      endAccessory={<PerpsSwapIcon direction="horizontal" />}
    />
  );
};

export default PerpsMarketLimitToggle;
