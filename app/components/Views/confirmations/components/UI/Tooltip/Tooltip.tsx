import React, { ReactNode, useState } from 'react';
import { Modal, ViewStyle } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  Text,
} from '@metamask/design-system-react-native';
import {
  IconColor as LegacyIconColor,
  IconName as LegacyIconName,
  IconSize as LegacyIconSize,
} from '../../../../../../component-library/components/Icons/Icon';

interface TooltipProps {
  content: string | ReactNode;
  disabled?: boolean;
  iconColor?: LegacyIconColor;
  iconName?: LegacyIconName;
  iconSize?: LegacyIconSize;
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

function mapIconColor(color?: LegacyIconColor, disabled?: boolean): IconColor {
  if (disabled) {
    return IconColor.IconMuted;
  }

  switch (color) {
    case LegacyIconColor.Error:
      return IconColor.ErrorDefault;
    case LegacyIconColor.Warning:
      return IconColor.WarningDefault;
    case LegacyIconColor.Success:
      return IconColor.SuccessDefault;
    case LegacyIconColor.Muted:
      return IconColor.IconMuted;
    case LegacyIconColor.Default:
      return IconColor.IconDefault;
    case LegacyIconColor.Inverse:
      return IconColor.IconInverse;
    case LegacyIconColor.Primary:
      return IconColor.PrimaryDefault;
    case LegacyIconColor.Info:
      return IconColor.InfoDefault;
    case LegacyIconColor.ErrorAlternative:
      return IconColor.ErrorAlternative;
    case LegacyIconColor.Alternative:
    default:
      return IconColor.IconAlternative;
  }
}

function mapIconName(name?: LegacyIconName): IconName {
  if (name && name in IconName) {
    return IconName[name as keyof typeof IconName];
  }
  return IconName.Info;
}

function mapIconSize(size?: LegacyIconSize): ButtonIconSize {
  switch (size) {
    case LegacyIconSize.Xs:
    case LegacyIconSize.Xss:
      return ButtonIconSize.Xs;
    case LegacyIconSize.Md:
      return ButtonIconSize.Md;
    case LegacyIconSize.Lg:
    case LegacyIconSize.Xl:
    case LegacyIconSize.XXL:
      return ButtonIconSize.Lg;
    case LegacyIconSize.Sm:
    default:
      return ButtonIconSize.Sm;
  }
}

export const TooltipModal = ({
  open,
  setOpen,
  content,
  title,
  tooltipTestId = 'tooltip-modal',
}: TooltipModalProps) => {
  const handleClose = () => setOpen(false);

  if (!open) {
    return null;
  }

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <BottomSheet
        testID={tooltipTestId}
        keyboardAvoidingViewEnabled={false}
        onClose={handleClose}
      >
        <BottomSheetHeader
          onClose={handleClose}
          closeButtonProps={{
            testID: `${tooltipTestId}-close-btn`,
          }}
        >
          {title}
        </BottomSheetHeader>
        {typeof content === 'string' ? (
          <Text twClassName="px-4 pb-4">{content}</Text>
        ) : (
          content
        )}
      </BottomSheet>
    </Modal>
  );
};

const Tooltip = ({
  content,
  disabled,
  title,
  tooltipTestId = 'info-row-tooltip',
  onPress,
  iconName = LegacyIconName.Info,
  iconColor,
  iconSize = LegacyIconSize.Sm,
  iconStyle,
}: TooltipProps) => {
  const [open, setOpen] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    setOpen(true);
    onPress?.();
  };

  return (
    <>
      <ButtonIcon
        iconName={mapIconName(iconName)}
        size={mapIconSize(iconSize)}
        isDisabled={disabled}
        onPress={handlePress}
        testID={`${tooltipTestId}-open-btn`}
        twClassName="ml-1"
        style={iconStyle}
        iconProps={{
          color: mapIconColor(iconColor, disabled),
        }}
      />
      <TooltipModal
        open={open}
        setOpen={setOpen}
        content={content}
        title={title}
        tooltipTestId={tooltipTestId}
      />
    </>
  );
};

export default Tooltip;
