import React, { ReactNode, useState } from 'react';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import BottomModal from '../bottom-modal';
import styleSheet from './Tooltip.styles';

interface TooltipProps {
  content: string | ReactNode;
  disabled?: boolean;
  iconColor?: IconColor;
  iconName?: IconName;
  iconSize?: IconSize;
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
        <HeaderStandard
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

const TOOLTIP_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const Tooltip = ({
  content,
  disabled,
  title,
  tooltipTestId = 'info-row-tooltip',
  onPress,
  iconName = IconName.Info,
  iconColor = IconColor.Muted,
  iconSize = IconSize.Sm,
  iconStyle,
}: TooltipProps) => {
  const [open, setOpen] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  const handlePress = () => {
    if (disabled) return;
    setOpen(true);
    onPress?.();
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        hitSlop={TOOLTIP_HIT_SLOP}
        testID={`${tooltipTestId}-open-btn`}
        style={[styles.iconButton, iconStyle]}
      >
        <Icon name={iconName} size={iconSize} color={iconColor} />
      </TouchableOpacity>
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
