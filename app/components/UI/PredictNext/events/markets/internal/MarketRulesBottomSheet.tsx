import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ModalSafeAreaProvider from '../../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictSettlementSource } from '../../../types';
import { MarketStandardCardTestIds } from '../MarketStandardCard.testIds';

interface MarketRulesBottomSheetProps {
  isVisible: boolean;
  marketId: string;
  rules: string;
  settlementSources?: readonly PredictSettlementSource[];
  onClose: () => void;
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalHost: {
    height: 0,
    position: 'absolute',
    width: 0,
  },
});

const MarketRulesBottomSheet = ({
  isVisible,
  marketId,
  rules,
  settlementSources,
  onClose,
}: MarketRulesBottomSheetProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);
  const handleSourcePress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  if (!isVisible) {
    return null;
  }

  const testID = MarketStandardCardTestIds.rulesSheet(marketId);
  const sources = settlementSources ?? [];

  return (
    <View pointerEvents="box-none" style={styles.modalHost}>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <ModalSafeAreaProvider>
          <GestureHandlerRootView style={styles.gestureRoot}>
            <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
              <BottomSheetHeader
                onClose={handleClose}
                closeButtonProps={{
                  testID: MarketStandardCardTestIds.rulesCloseButton(marketId),
                }}
              >
                {strings('predict.market_rules.title')}
              </BottomSheetHeader>
              <ScrollView
                style={tw.style('px-4')}
                contentContainerStyle={tw.style('pb-8')}
                testID={MarketStandardCardTestIds.rulesContent(marketId)}
              >
                <Box twClassName="gap-4">
                  {sources.length > 0 ? (
                    <Text
                      testID={MarketStandardCardTestIds.rulesSources(marketId)}
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                    >
                      {strings(
                        'predict.market_rules.settlement_sources.prefix',
                      )}{' '}
                      {sources.map((source, index) => (
                        <React.Fragment
                          key={`${source.url}-${source.name}-${index}`}
                        >
                          {index > 0
                            ? index === sources.length - 1
                              ? sources.length === 2
                                ? ' and '
                                : ', and '
                              : ', '
                            : null}
                          <Text
                            testID={MarketStandardCardTestIds.rulesSourceLink(
                              marketId,
                              index,
                            )}
                            variant={TextVariant.BodyMd}
                            color={TextColor.PrimaryDefault}
                            accessibilityRole="link"
                            accessibilityLabel={source.name}
                            onPress={() => handleSourcePress(source.url)}
                          >
                            {source.name}
                          </Text>
                        </React.Fragment>
                      ))}
                      {strings(
                        'predict.market_rules.settlement_sources.suffix',
                      )}
                    </Text>
                  ) : null}
                  <Text
                    testID={MarketStandardCardTestIds.rulesText(marketId)}
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                  >
                    {rules}
                  </Text>
                </Box>
              </ScrollView>
            </BottomSheet>
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};

export default MarketRulesBottomSheet;
