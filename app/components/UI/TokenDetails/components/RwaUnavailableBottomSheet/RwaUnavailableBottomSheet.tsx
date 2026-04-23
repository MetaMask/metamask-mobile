import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { InteractionManager, TouchableOpacity } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';

const ONDO_ELIGIBILITY_URL =
  'https://docs.ondo.finance/ondo-global-markets/eligibility';

interface RwaUnavailableBottomSheetProps {
  onDismiss?: () => void;
}

export interface RwaUnavailableBottomSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

const RwaUnavailableBottomSheet = forwardRef<
  RwaUnavailableBottomSheetRef,
  RwaUnavailableBottomSheetProps
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

  const handleOndoEligibilityPress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: ONDO_ELIGIBILITY_URL,
          title: strings('rwa.unavailable.link'),
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
    <BottomSheet ref={sheetRef} isInteractable onClose={handleSheetClosed}>
      <BottomSheetHeader onClose={closeSheet}>
        {strings('rwa.unavailable.title')}
      </BottomSheetHeader>

      <TouchableOpacity
        testID="rwa-unavailable-ondo-eligibility-link"
        onPress={handleOndoEligibilityPress}
        activeOpacity={0.8}
      >
        <Box
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Start}
          twClassName="px-4 pb-4"
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rwa.unavailable.description')}{' '}
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary text-primary-default"
            >
              {strings('rwa.unavailable.link')}
            </Text>
            .
          </Text>
        </Box>
      </TouchableOpacity>

      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('rwa.unavailable.button'),
          onPress: closeSheet,
        }}
        style={tw.style('px-4')}
      />
    </BottomSheet>
  );
});

RwaUnavailableBottomSheet.displayName = 'RwaUnavailableBottomSheet';

export default RwaUnavailableBottomSheet;
