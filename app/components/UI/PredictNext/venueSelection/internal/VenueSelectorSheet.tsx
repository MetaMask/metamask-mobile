import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../locales/i18n';
import type { PredictConfiguredVenue } from '../../implementation';
import { PredictVenueSelectorTestIds } from '../PredictVenueSelector.testIds';

const VENUE_LABEL_KEYS: Record<PredictConfiguredVenue, string> = {
  polymarket: 'predict_next.venue_selector.venues.polymarket',
  kalshi: 'predict_next.venue_selector.venues.kalshi',
};

/**
 * How long to wait for iOS to report the modal dismissed before applying the
 * selection anyway, so a missed `onDismiss` never swallows a choice.
 */
export const VENUE_SELECTOR_DISMISS_FALLBACK_MS = 1_000;

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
  /** Runs once the sheet's modal has been dismissed. */
  onSelect: (venue: PredictConfiguredVenue) => void;
  /** Runs once the sheet's modal has been dismissed, with or without a choice. */
  onClose: () => void;
}

/** Lists the selectable Venues with the Active Venue marked. */
export const VenueSelectorSheet = ({
  venues,
  activeVenue,
  onSelect,
  onClose,
}: VenueSelectorSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isModalVisible, setIsModalVisible] = useState(true);
  const pendingVenueRef = useRef<PredictConfiguredVenue | undefined>(undefined);
  const isFinishedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);
  onSelectRef.current = onSelect;
  onCloseRef.current = onClose;

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  /**
   * Hands the choice over only once the modal is gone. A choice remounts the
   * screen that presents the modal; doing that while iOS is still dismissing
   * it froze the app (PRED-1401 QA, Kalshi → Polymarket).
   */
  const finish = useCallback(() => {
    if (isFinishedRef.current) {
      return;
    }
    isFinishedRef.current = true;
    const venue = pendingVenueRef.current;
    onCloseRef.current();
    if (venue) {
      onSelectRef.current(venue);
    }
  }, []);

  useEffect(() => {
    if (isModalVisible) {
      return undefined;
    }
    // Android has no `onDismiss`: hiding is complete once this commit lands.
    if (Platform.OS !== 'ios') {
      finish();
      return undefined;
    }
    const fallback = setTimeout(finish, VENUE_SELECTOR_DISMISS_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [finish, isModalVisible]);

  const hideModal = useCallback(() => setIsModalVisible(false), []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSelect = useCallback((venue: PredictConfiguredVenue) => {
    pendingVenueRef.current = venue;
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <View pointerEvents="box-none" style={styles.modalHost}>
      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
        onDismiss={finish}
      >
        <ModalSafeAreaProvider>
          <GestureHandlerRootView style={styles.gestureRoot}>
            <BottomSheet
              ref={sheetRef}
              onClose={hideModal}
              testID={PredictVenueSelectorTestIds.SHEET}
            >
              <BottomSheetHeader
                onClose={handleClose}
                closeButtonProps={{
                  testID: PredictVenueSelectorTestIds.CLOSE_BUTTON,
                  accessibilityLabel: strings('navigation.close'),
                }}
              >
                {strings('predict_next.venue_selector.title')}
              </BottomSheetHeader>
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
                      accessibilityState={{ selected: isSelected }}
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
