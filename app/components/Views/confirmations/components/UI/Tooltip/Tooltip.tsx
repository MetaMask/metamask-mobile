import React, { ReactNode, useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
} from '@metamask/design-system-react-native';
import { Modal, TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
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
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <>
      {open && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleRequestClose}
        >
          <BottomSheet
            ref={bottomSheetRef}
            keyboardAvoidingViewEnabled={false}
            onClose={handleSheetClosed}
          >
            <BottomSheetHeader
              onClose={handleRequestClose}
              closeButtonProps={{
                testID: `${tooltipTestId}-close-btn`,
              }}
            >
              {title}
            </BottomSheetHeader>
            <Box twClassName="flex flex-col">
              <View style={styles.modalContent}>
                {typeof content === 'string' ? (
                  <Text style={styles.modalContentValue}>{content}</Text>
                ) : (
                  content
                )}
              </View>
            </Box>
          </BottomSheet>
        </Modal>
      )}
    </>
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
