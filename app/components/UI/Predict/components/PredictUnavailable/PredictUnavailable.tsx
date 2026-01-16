import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { InteractionManager } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';

// Internal dependencies.
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';

interface PredictUnavailableProps {
  onDismiss?: () => void;
}

export interface PredictUnavailableRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

const PredictUnavailable = forwardRef<
  PredictUnavailableRef,
  PredictUnavailableProps
>(({ onDismiss }, ref) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tw = useTailwind();
  const navigation = useNavigation();

  const handleSheetClosed = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const closeSheet = useCallback(() => {
    if (!sheetRef.current) {
      setIsVisible(false);
      onDismiss?.();
      return;
    }

    sheetRef.current.onCloseBottomSheet(() => {
      setIsVisible(false);
    });
  }, [onDismiss]);

  const handleClose = () => {
    closeSheet();
  };

  const handleGotItPress = () => {
    handleClose();
  };

  const handlePolymarketTermsPress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://polymarket.com/tos',
          title: strings('predict.unavailable.webview_title'),
        },
      });
    });
  }, [navigation]);

  useImperativeHandle(
    ref,
    () => ({
      onOpenBottomSheet: () => {
        if (!isVisible) {
          setIsVisible(true);
          return;
        }

        sheetRef.current?.onOpenBottomSheet();
      },
      onCloseBottomSheet: () => {
        closeSheet();
      },
    }),
    [closeSheet, isVisible],
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      isInteractable
      onClose={handleSheetClosed}
    >
      <BottomSheetHeader onClose={handleClose} style={tw.style('px-6 py-4')}>
        <Text variant={TextVariant.HeadingMd} twClassName="text-default">
          {strings('predict.unavailable.title')}
        </Text>
      </BottomSheetHeader>

      <TouchableOpacity
        onPress={handlePolymarketTermsPress}
        testID="polymarket-terms-link"
        activeOpacity={0.8}
      >
        <Box
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Start}
          twClassName="px-6 py-4"
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-default">
            {strings('predict.unavailable.description')}{' '}
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary text-primary-default"
            >
              {strings('predict.unavailable.link')}
            </Text>
            .
          </Text>
        </Box>
      </TouchableOpacity>

      <BottomSheetFooter
        buttonPropsArray={[
          {
            variant: ButtonVariants.Primary,
            label: strings('predict.unavailable.button'),
            onPress: handleGotItPress,
          },
        ]}
        style={tw.style('px-6 py-4')}
      />
    </BottomSheet>
  );
});

export default PredictUnavailable;
