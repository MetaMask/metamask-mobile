import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
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
  getMMPayVisualPresetGroups,
  getMMPayVisualStateId,
  MMPayVisualStateId,
  setMMPayVisualStateId,
  subscribeMMPayVisualState,
} from './mmPayVisualValidation';

export interface MMPayVisualStateBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * __DEV__ bottom sheet listing named MM Pay confirmation visual presets.
 */
export function MMPayVisualStateBottomSheet({
  isVisible,
  onClose,
}: MMPayVisualStateBottomSheetProps) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [selectedId, setSelectedId] = React.useState<MMPayVisualStateId>(
    getMMPayVisualStateId,
  );

  useEffect(() => {
    return subscribeMMPayVisualState(() => {
      setSelectedId(getMMPayVisualStateId());
    });
  }, []);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const groups = useMemo(() => getMMPayVisualPresetGroups(), []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [onClose]);

  const handleSelect = useCallback(
    (id: MMPayVisualStateId) => {
      setMMPayVisualStateId(id);
      setSelectedId(id);
      handleClose();
    },
    [handleClose],
  );

  if (!__DEV__ || !isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      isInteractable
    >
      <BottomSheetHeader onClose={handleClose}>
        MM Pay error states
      </BottomSheetHeader>
      <ScrollView testID="mm-pay-visual-state-sheet" style={{ maxHeight: 480 }}>
        <Box paddingHorizontal={4} paddingBottom={6} gap={4}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Force error / empty UI for visual QA. Selecting a flow-specific
            preset also updates the navbar title (e.g. Withdraw, Send). Select
            Live to clear.
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
                  testID={`mm-pay-visual-state-${preset.id}`}
                />
              ))}
            </Box>
          ))}
        </Box>
      </ScrollView>
    </BottomSheet>
  );
}
