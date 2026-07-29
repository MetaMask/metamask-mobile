import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsClosePositionVisualPresetGroups,
  getPerpsClosePositionVisualStateId,
  PerpsClosePositionVisualStateId,
  PerpsSliderInputVisualPage,
  setPerpsClosePositionVisualStateId,
  subscribePerpsClosePositionVisualState,
} from './perpsClosePositionVisualValidation';

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 480,
  },
});

export interface PerpsClosePositionVisualStateBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  /** Filter presets to the screen that opened the sheet. */
  page?: PerpsSliderInputVisualPage;
}

/**
 * __DEV__ bottom sheet listing named slider-input visual presets
 * (Close Position and Add/Remove Margin).
 */
export function PerpsClosePositionVisualStateBottomSheet({
  isVisible,
  onClose,
  page = 'close',
}: PerpsClosePositionVisualStateBottomSheetProps) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [selectedId, setSelectedId] =
    React.useState<PerpsClosePositionVisualStateId>(
      getPerpsClosePositionVisualStateId,
    );

  useEffect(() => subscribePerpsClosePositionVisualState(() => {
      setSelectedId(getPerpsClosePositionVisualStateId());
    }), []);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const groups = useMemo(
    () => getPerpsClosePositionVisualPresetGroups(page),
    [page],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [onClose]);

  const handleSelect = useCallback(
    (id: PerpsClosePositionVisualStateId) => {
      setPerpsClosePositionVisualStateId(id);
      setSelectedId(id);
      handleClose();
    },
    [handleClose],
  );

  if (!__DEV__ || !isVisible) {
    return null;
  }

  const title =
    page === 'margin' ? 'Add / remove margin states' : 'Close position states';
  const description =
    page === 'margin'
      ? 'Force slider, keypad, errors, and loading UI for visual QA. Select Live to clear.'
      : 'Force market / limit, slider, keypad, and validation UI for visual QA. Select Live to clear.';

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      isInteractable
    >
      <BottomSheetHeader onClose={handleClose}>{title}</BottomSheetHeader>
      <ScrollView
        testID="perps-close-position-visual-state-sheet"
        style={styles.scrollView}
      >
        <Box paddingHorizontal={4} paddingBottom={6} gap={4}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {description}
          </Text>
          {groups.map(({ group, presets }) => (
            <Box key={group} gap={1}>
              <Text
                variant={TextVariant.BodyMd}
                twClassName="pt-2 pb-1"
                color={TextColor.TextAlternative}
              >
                {group}
              </Text>
              {presets.map((preset) => (
                <ListItemSelect
                  key={preset.id}
                  isSelected={selectedId === preset.id}
                  showSelectedIcon={false}
                  onPress={() => handleSelect(preset.id)}
                  title={preset.label}
                  description={preset.description}
                  testID={`perps-close-position-visual-state-${preset.id}`}
                />
              ))}
            </Box>
          ))}
        </Box>
      </ScrollView>
    </BottomSheet>
  );
}
