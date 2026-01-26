import React, { useRef, isValidElement, useCallback } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';

import { TooltipModalProps } from './ToolTipModal.types';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './ToolTipModal.styles';

const TooltipModal = ({ route }: TooltipModalProps) => {
  const { tooltip, title, bottomPadding } = route.params;

  const { styles } = useStyles(styleSheet, { bottomPadding });

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onCloseModal = () => bottomSheetRef.current?.onCloseBottomSheet();

  const handleGotItPress = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const footerButtons = [
    {
      label: strings('browser.got_it'),
      onPress: handleGotItPress,
      variant: ButtonVariants.Secondary,
      size: ButtonSize.Lg,
    },
  ];

  return (
    <BottomSheet ref={bottomSheetRef}>
      <HeaderCenter title={title} onClose={onCloseModal} />
      <View style={styles.content}>
        {isValidElement(tooltip) ? (
          tooltip
        ) : (
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {tooltip}
          </Text>
        )}
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default TooltipModal;
