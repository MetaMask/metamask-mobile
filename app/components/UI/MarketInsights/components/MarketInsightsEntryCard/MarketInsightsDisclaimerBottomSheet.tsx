import React, { useCallback, useMemo, useRef } from 'react';
import { Modal, View } from 'react-native';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import {
  BottomSheet,
  BottomSheetFooter,
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
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

interface MarketInsightsDisclaimerBottomSheetProps {
  onClose: () => void;
}

const MarketInsightsDisclaimerBottomSheet: React.FC<
  MarketInsightsDisclaimerBottomSheetProps
> = ({ onClose }) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
        <ModalSafeAreaProvider testID="market-insights-disclaimer-safe-area-provider">
          <BottomSheet ref={bottomSheetRef} onClose={onClose}>
            <BottomSheetHeaderGlass
              isGlass={isGlassHeader}
              onClose={handleClose}
            >
              {strings('market_insights.disclaimer_modal.title')}
            </BottomSheetHeaderGlass>

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
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};

export default MarketInsightsDisclaimerBottomSheet;
