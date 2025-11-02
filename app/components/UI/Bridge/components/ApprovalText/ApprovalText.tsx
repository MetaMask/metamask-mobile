import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import { strings } from '../../../../../../locales/i18n';

interface ApprovalTextProps {
  amount: string;
  symbol: string;
}

/**
 * Component that displays approval information for tokens requiring approval before swapping/bridging.
 * Shows the approval amount and symbol with an info icon that opens a tooltip modal.
 */
const ApprovalText: React.FC<ApprovalTextProps> = ({ amount, symbol }) => {
  const { openTooltipModal } = useTooltipModal();

  const handleTooltipPress = () => {
    openTooltipModal(
      strings('bridge.approval_tooltip_title'),
      strings('bridge.approval_tooltip_content', { amount, symbol }),
    );
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-1 mt-2"
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="flex-1"
      >
        {strings('bridge.approval_needed', { amount, symbol })}
      </Text>
      <ButtonIcon
        iconName={IconName.Info}
        size={ButtonIconSizes.Sm}
        iconColor={IconColor.Muted}
        onPress={handleTooltipPress}
        accessibilityLabel={strings('bridge.approval_tooltip_title')}
        accessibilityRole="button"
      />
    </Box>
  );
};

export default ApprovalText;
