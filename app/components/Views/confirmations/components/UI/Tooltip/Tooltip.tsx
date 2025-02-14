import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';
import Modal from 'react-native-modal';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTheme } from '../../../../../../util/theme';
import styleSheet from './Tooltip.styles';

interface TooltipProps {
  content: ReactNode;
  title?: string;
  tooltipTestId?: string;
}

const Tooltip = ({ content, title, tooltipTestId }: TooltipProps) => {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

  return (
    <View>
      <ButtonIcon
        iconColor={IconColor.Muted}
        iconName={IconName.Info}
        onPress={() => setOpen(true)}
        size={ButtonIconSizes.Sm}
        testID={tooltipTestId ?? 'tooltipTestId'}
      />
      <Modal
        isVisible={open}
        onBackdropPress={() => setOpen(false)}
        onBackButtonPress={() => setOpen(false)}
        onSwipeComplete={() => setOpen(false)}
        swipeDirection={'down'}
        style={styles.modal}
        propagateSwipe
        backdropColor={colors.overlay.default}
        backdropOpacity={1}
      >
        <View style={styles.modalView}>
          <ButtonIcon
            iconColor={IconColor.Default}
            iconName={IconName.Close}
            onPress={() => setOpen(false)}
            size={ButtonIconSizes.Sm}
            style={styles.closeModalBtn}
            testID={tooltipTestId ?? 'tooltipTestId'}
          />
          {title && <Text style={styles.modalTitle}>{title}</Text>}
          <Text style={styles.modalContent}>{content}</Text>
        </View>
      </Modal>
    </View>
  );
};

export default Tooltip;
