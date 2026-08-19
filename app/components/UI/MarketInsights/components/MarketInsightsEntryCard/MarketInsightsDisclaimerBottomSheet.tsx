import React, { useCallback, useMemo, useRef } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonsAlignment,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface MarketInsightsDisclaimerBottomSheetProps {
  onClose: () => void;
}

const MarketInsightsDisclaimerBottomSheet: React.FC<
  MarketInsightsDisclaimerBottomSheetProps
> = ({ onClose }) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('market_insights.disclaimer_modal.got_it'),
      onPress: handleClose,
      size: ButtonSize.Lg,
      variant: ButtonVariant.Primary,
    }),
    [handleClose],
  );

  return (
    <View>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        {/*
          On Android a Modal is its own window, and `statusBarTranslucent` makes
          it draw under the system bars. The root SafeAreaProvider measures the
          activity window, so it reports a bottom inset of 0 here and
          BottomSheetDialog's bottom padding collapses — leaving the footer
          button under the navigation bar. A nested provider measures this
          window instead, so the inset is right on every Android version.
        */}
        <SafeAreaProvider testID="market-insights-disclaimer-safe-area-provider">
          <BottomSheet ref={bottomSheetRef} onClose={onClose}>
            <BottomSheetHeader onClose={handleClose}>
              {strings('market_insights.disclaimer_modal.title')}
            </BottomSheetHeader>

            <Box paddingHorizontal={4}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('market_insights.disclaimer_modal.body')}
              </Text>
            </Box>

            <BottomSheetFooter
              buttonsAlignment={ButtonsAlignment.Horizontal}
              primaryButtonProps={primaryButtonProps}
              twClassName="pt-6"
            />
          </BottomSheet>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
};

export default MarketInsightsDisclaimerBottomSheet;
