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

import { TooltipModalRouteParams } from './ToolTipModal.types';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './ToolTipModal.styles';
import { useParams } from '../../../util/navigation/navUtils';

const TooltipModal = () => {
  const { tooltip, title, footerText, buttonText, bottomPadding } =
    useParams<TooltipModalRouteParams>();

  const { styles } = useStyles(styleSheet, { bottomPadding });

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onCloseModal = () => bottomSheetRef.current?.onCloseBottomSheet();

  const handleGotItPress = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const footerButtons = [
    {
      label: buttonText ?? strings('browser.got_it'),
      onPress: handleGotItPress,
      variant: ButtonVariants.Primary,
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
      {footerText && (
        <View style={styles.footerTextContainer}>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {footerText}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
};

export default TooltipModal;
