import React, { useRef } from 'react';
import { Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ModalSafeAreaProvider from '../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';

interface Props {
  onClose: () => void;
}

export function EpicOddsInfoSheet({ onClose }: Props) {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);

  const close = () => sheetRef.current?.onCloseBottomSheet();

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={close}
    >
      <ModalSafeAreaProvider>
        <GestureHandlerRootView style={tw.style('flex-1')}>
          <BottomSheet
            ref={sheetRef}
            goBack={onClose}
            keyboardAvoidingViewEnabled={false}
            testID={collectiblesTestIds.epicOddsInfoSheet}
          >
            <BottomSheetHeader
              onClose={close}
              closeButtonProps={{
                testID: collectiblesTestIds.epicOddsInfoClose,
              }}
            >
              {strings('collectibles.landing.epic_vs_odds')}
            </BottomSheetHeader>
            <View className="gap-4 px-4 pb-6">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('collectibles.epic_vs_odds.info_ranking')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('collectibles.epic_vs_odds.info_gauge')}
              </Text>
              <Text variant={TextVariant.BodyMd}>
                {strings('collectibles.epic_vs_odds.info_independent')}
              </Text>
            </View>
          </BottomSheet>
        </GestureHandlerRootView>
      </ModalSafeAreaProvider>
    </Modal>
  );
}
