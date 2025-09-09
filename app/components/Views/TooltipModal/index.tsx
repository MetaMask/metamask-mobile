import React, { useRef, isValidElement } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './ToolTipModal.styles';
import type { RootParamList } from '../../../util/navigation';
import type { StackScreenProps } from '@react-navigation/stack';

type TooltipModalProps = StackScreenProps<RootParamList, 'TooltipModal'>;

const TooltipModal = ({ route }: TooltipModalProps) => {
  const tooltip = route.params.tooltip;
  const title = route.params.title;

  const { styles } = useStyles(styleSheet, {});

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onCloseModal = () => bottomSheetRef.current?.onCloseBottomSheet();

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View>
        <BottomSheetHeader onClose={onCloseModal}>
          <Text variant={TextVariant.HeadingMD}>{title}</Text>
        </BottomSheetHeader>
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
