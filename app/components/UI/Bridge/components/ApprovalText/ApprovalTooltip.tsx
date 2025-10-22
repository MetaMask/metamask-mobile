import React from 'react';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import { strings } from '../../../../../../locales/i18n';

interface ApprovalTooltipProps {
  amount: string;
  symbol: string;
}

/**
 * Component that displays a tooltip icon for approval information.
 * Opens a modal with details about the token approval when pressed.
 */
const ApprovalTooltip: React.FC<ApprovalTooltipProps> = ({
  amount,
  symbol,
}) => {
  const { openTooltipModal } = useTooltipModal();

  const handleTooltipPress = () => {
    openTooltipModal(
      strings('bridge.approval_tooltip_title'),
      strings('bridge.approval_tooltip_content', { amount, symbol }),
    );
  };

  return (
    <ButtonIcon
      iconName={IconName.Info}
      size={ButtonIconSizes.Sm}
      iconColor={IconColor.Alternative}
      onPress={handleTooltipPress}
      accessibilityLabel={strings('bridge.approval_tooltip_title')}
      accessibilityRole="button"
    />
  );
};

export default ApprovalTooltip;
