import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  FontWeight,
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
import type { PredictMarket, PredictSettlementSource } from '../../../types';
import { RulesBottomSheetTestIds } from './RulesBottomSheet.testIds';

export interface RulesBottomSheetProps {
  isVisible: boolean;
  eventRules?: string;
  market?: Pick<PredictMarket, 'id' | 'question' | 'rules'>;
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

const RulesBottomSheet = ({
  isVisible,
  eventRules: eventRulesValue,
  market,
  settlementSources,
  onClose,
}: RulesBottomSheetProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const eventRules = eventRulesValue?.trim();
  const marketRules = market?.rules?.trim();
  const shouldShowMarketRules = Boolean(
    market && marketRules && marketRules !== eventRules,
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSourcePress = useCallback(
    (url: PredictSettlementSource['url']) => {
      Linking.openURL(url).catch(() => undefined);
    },
    [],
  );

  if (!isVisible) {
    return null;
  }

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
            <BottomSheet
              ref={sheetRef}
              onClose={onClose}
              testID={RulesBottomSheetTestIds.SHEET}
            >
              <BottomSheetHeader
                onClose={handleClose}
                closeButtonProps={{
                  testID: RulesBottomSheetTestIds.CLOSE_BUTTON,
                  accessibilityLabel: strings(
                    'predict.rules.close_accessibility_label',
                  ),
                }}
              >
                {strings('predict.rules.title')}
              </BottomSheetHeader>
              <ScrollView
                style={tw.style('px-4')}
                contentContainerStyle={tw.style('pb-8')}
                testID={RulesBottomSheetTestIds.CONTENT}
              >
                <Box twClassName="gap-4">
                  {sources.length > 0 ? (
                    <Text
                      testID={RulesBottomSheetTestIds.SOURCES}
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                    >
                      {strings('predict.rules.settlement_sources.prefix')}
                      {sources.map((source, index) => {
                        const sourceName = source.name.trim();

                        return (
                          <React.Fragment
                            key={`${source.url}-${sourceName}-${index}`}
                          >
                            {index > 0
                              ? index === sources.length - 1
                                ? strings(
                                    'predict.rules.settlement_sources.last_separator',
                                  )
                                : strings(
                                    'predict.rules.settlement_sources.separator',
                                  )
                              : null}
                            <Text
                              testID={RulesBottomSheetTestIds.SOURCE_LINK(
                                index,
                              )}
                              variant={TextVariant.BodyMd}
                              color={TextColor.PrimaryDefault}
                              accessibilityRole="link"
                              accessibilityLabel={sourceName}
                              accessibilityHint={strings(
                                'predict.rules.settlement_sources.open_hint',
                              )}
                              onPress={() => handleSourcePress(source.url)}
                            >
                              {sourceName}
                            </Text>
                          </React.Fragment>
                        );
                      })}
                      {strings('predict.rules.settlement_sources.suffix')}
                    </Text>
                  ) : null}
                  {eventRules ? (
                    <Box
                      testID={RulesBottomSheetTestIds.EVENT_RULES}
                      twClassName="gap-2"
                    >
                      <Text
                        variant={TextVariant.HeadingSm}
                        fontWeight={FontWeight.Bold}
                      >
                        {strings('predict.rules.event_title')}
                      </Text>
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextDefault}
                      >
                        {eventRules}
                      </Text>
                    </Box>
                  ) : null}
                  {shouldShowMarketRules && market ? (
                    <Box
                      testID={RulesBottomSheetTestIds.MARKET_RULES}
                      twClassName="gap-2"
                    >
                      <Text
                        variant={TextVariant.HeadingSm}
                        fontWeight={FontWeight.Bold}
                      >
                        {strings('predict.rules.market_title')}
                      </Text>
                      <Text
                        testID={RulesBottomSheetTestIds.MARKET_QUESTION}
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {market.question}
                      </Text>
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextDefault}
                      >
                        {marketRules}
                      </Text>
                    </Box>
                  ) : null}
                </Box>
              </ScrollView>
            </BottomSheet>
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};

export default RulesBottomSheet;
