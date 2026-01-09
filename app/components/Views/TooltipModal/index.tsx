import React, { useRef, isValidElement } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { TooltipModalProps } from './ToolTipModal.types';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './ToolTipModal.styles';

const TooltipModal = ({ route }: TooltipModalProps) => {
  const { tooltip, title, bottomPadding } = route.params;

  const { styles } = useStyles(styleSheet, { bottomPadding });

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onCloseModal = () => bottomSheetRef.current?.onCloseBottomSheet();

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View>
        <BottomSheetHeader onClose={onCloseModal}>{title}</BottomSheetHeader>
        <View style={styles.content}>
          {isValidElement(tooltip) ? (
            tooltip
          ) : (
            <Text variant={TextVariant.BodyMD}>{tooltip}</Text>
          )}
        </View>
      </View>
    </BottomSheet>
  );
};

export default TooltipModal;
