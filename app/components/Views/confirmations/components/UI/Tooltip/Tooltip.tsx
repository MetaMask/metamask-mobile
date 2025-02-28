import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import BottomModal from '../BottomModal';
import styleSheet from './Tooltip.styles';

interface TooltipProps {
  content: string | ReactNode;
  title?: string;
  tooltipTestId?: string;
}

interface TooltipModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  content: string | ReactNode;
  title?: string;
  tooltipTestId?: string;
}

export const TooltipModal = ({ open, setOpen, content, title, tooltipTestId = 'tooltip-modal' }: TooltipModalProps) => {
  const { styles } = useStyles(styleSheet, { title: title ?? '' });

  return (
    <BottomModal
      visible={open}
      onClose={() => setOpen(false)}
    >
      <View style={styles.modalView}>
        <View style={styles.modalHeader}>
          <ButtonIcon
            iconColor={IconColor.Default}
            iconName={IconName.ArrowLeft}
            onPress={() => setOpen(false)}
            size={ButtonIconSizes.Sm}
            style={styles.closeModalBtn}
            testID={`${tooltipTestId}-close-btn`}
            />
          {<Text style={styles.modalTitle}>{title ?? ''}</Text>}
        </View>
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

const Tooltip = ({ content, title, tooltipTestId = 'info-row-tooltip' }: TooltipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <ButtonIcon
        iconColor={IconColor.Muted}
        iconName={IconName.Info}
        onPress={() => setOpen(true)}
        size={ButtonIconSizes.Sm}
        testID={`${tooltipTestId}-open-btn`}
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
