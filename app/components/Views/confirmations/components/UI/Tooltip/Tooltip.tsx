import React, { ReactNode, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import BottomModal from '../bottom-modal';
import styleSheet from './Tooltip.styles';

interface TooltipProps {
  content: string | ReactNode;
  iconColor?: IconColor;
  iconName?: IconName;
  iconSize?: ButtonIconSizes;
  iconStyle?: ViewStyle;
  onPress?: () => void;
  title?: string;
  tooltipTestId?: string;
}

interface TooltipModalProps {
  content: string | ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  title?: string;
  tooltipTestId?: string;
}

export const TooltipModal = ({
  open,
  setOpen,
  content,
  title,
  tooltipTestId = 'tooltip-modal',
}: TooltipModalProps) => {
  const { styles } = useStyles(styleSheet, { title: title ?? '' });

  return (
    <BottomModal visible={open} onClose={() => setOpen(false)} isTooltip>
      <View style={styles.modalView}>
        <HeaderCenter
          title={title}
          onClose={() => setOpen(false)}
          closeButtonProps={{
            testID: `${tooltipTestId}-close-btn`,
          }}
        />
        <View style={styles.modalContent}>
          {typeof content === 'string' ? (
            <Text style={styles.modalContentValue}>{content}</Text>
          ) : (
            content
          )}
        </View>
      </View>
    </BottomModal>
  );
};

const Tooltip = ({
  content,
  title,
  tooltipTestId = 'info-row-tooltip',
  onPress,
  iconName = IconName.Info,
  iconColor = IconColor.Muted,
  iconSize = ButtonIconSizes.Sm,
  iconStyle = {},
}: TooltipProps) => {
  const [open, setOpen] = useState(false);

  const handlePress = () => {
    setOpen(true);
    onPress?.();
  };

  return (
    <View>
      <ButtonIcon
        iconColor={iconColor}
        iconName={iconName}
        onPress={handlePress}
        size={iconSize}
        testID={`${tooltipTestId}-open-btn`}
        style={iconStyle}
      />
      <TooltipModal
        open={open}
        setOpen={setOpen}
        content={content}
        title={title}
        tooltipTestId={tooltipTestId}
      />
    </View>
  );
};

export default Tooltip;
