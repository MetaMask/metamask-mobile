import React, { useRef, isValidElement } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { TooltipModalProps } from './ToolTipModal.types';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './ToolTipModal.styles';

const TooltipModal = ({ route }: TooltipModalProps) => {
  const tooltip = route.params.tooltip;
  const title = route.params.title;

  const { styles } = useStyles(styleSheet, {});

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onCloseModal = () => bottomSheetRef.current?.onCloseBottomSheet();

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View>
        <HeaderCenter title={title} onClose={onCloseModal} />
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
