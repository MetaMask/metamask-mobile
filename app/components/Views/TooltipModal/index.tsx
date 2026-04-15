import React, { useRef, isValidElement, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BottomSheetFooter,
  ButtonSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../locales/i18n';

import { TooltipModalRouteParams } from './ToolTipModal.types';
import { useParams } from '../../../util/navigation/navUtils';

const TooltipModal = () => {
  const { tooltip, title, footerText, buttonText, onButtonPress } =
    useParams<TooltipModalRouteParams>();

  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onCloseModal = () => bottomSheetRef.current?.onCloseBottomSheet();

  const handleGotItPress = useCallback(() => {
    onButtonPress?.();
    bottomSheetRef.current?.onCloseBottomSheet();
  }, [onButtonPress]);

  return (
    <BottomSheet ref={bottomSheetRef}>
      <HeaderCompactStandard title={title} onClose={onCloseModal} />
      <Box twClassName="px-4">
        {isValidElement(tooltip) ? (
          tooltip
        ) : (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {tooltip}
          </Text>
        )}
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: buttonText ?? strings('browser.got_it'),
          onPress: handleGotItPress,
        }}
        twClassName="px-4 pt-6"
        style={tw.style({ paddingBottom: footerText ? 0 : insets.bottom })}
      />
      {footerText && (
        <Box
          style={tw.style('flex-row justify-center px-4 pt-1', {
            paddingBottom: insets.bottom,
          })}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {footerText}
          </Text>
        </Box>
      )}
    </BottomSheet>
  );
};

export default TooltipModal;
