import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  Box,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../locales/i18n';
import type { PredictConfiguredVenue } from '../../implementation';
import { PredictVenueSelectorTestIds } from '../PredictVenueSelector.testIds';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const VENUE_LABEL_KEYS: Record<PredictConfiguredVenue, string> = {
  polymarket: 'predict_next.venue_selector.venues.polymarket',
  kalshi: 'predict_next.venue_selector.venues.kalshi',
};

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

export interface VenueSelectorSheetProps {
  venues: readonly PredictConfiguredVenue[];
  /** Marked as selected; `undefined` while the Active Venue is resolving. */
  activeVenue: PredictConfiguredVenue | undefined;
  /** Runs once the sheet has closed. */
  onSelect: (venue: PredictConfiguredVenue) => void;
  onClose: () => void;
}

/** Lists the selectable Venues with the Active Venue marked. */
export const VenueSelectorSheet = ({
  venues,
  activeVenue,
  onSelect,
  onClose,
}: VenueSelectorSheetProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSelect = useCallback(
    (venue: PredictConfiguredVenue) => {
      sheetRef.current?.onCloseBottomSheet(() => onSelect(venue));
    },
    [onSelect],
  );

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
              testID={PredictVenueSelectorTestIds.SHEET}
            >
              <BottomSheetHeaderGlass
                isGlass={isGlassHeader}
                onClose={handleClose}
                closeButtonProps={{
                  testID: PredictVenueSelectorTestIds.CLOSE_BUTTON,
                  accessibilityLabel: strings('navigation.close'),
                }}
              >
                {strings('predict_next.venue_selector.title')}
              </BottomSheetHeaderGlass>
              <Box twClassName="pb-4">
                {venues.map((venue) => {
                  const isSelected = venue === activeVenue;
                  return (
                    <ListItemSelect
                      key={venue}
                      testID={PredictVenueSelectorTestIds.option(venue)}
                      title={strings(VENUE_LABEL_KEYS[venue])}
                      isSelected={isSelected}
                      showSelectedIcon
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => handleSelect(venue)}
                    />
                  );
                })}
              </Box>
            </BottomSheet>
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};
