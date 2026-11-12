import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  ListItemSelect,
  ListItemVariant,
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import CollectiblesSheetModal from '../CollectiblesSheetModal/CollectiblesSheetModal';

/** Reusable accessible single-choice sheet for catalogue and collection filters. */
export default function DiscoveryOptionsSheet<Value extends string>({
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  title: string;
  options: { value: Value; label: string }[];
  value: Value;
  onSelect: (value: Value) => void;
  onClose: () => void;
}) {
  const tw = useTailwind();
  const sheet = useRef<BottomSheetRef>(null);
  useEffect(() => {
    sheet.current?.onOpenBottomSheet();
  }, []);
  const close = () => sheet.current?.onCloseBottomSheet();
  return (
    <CollectiblesSheetModal onRequestClose={close}>
      <BottomSheet ref={sheet} goBack={onClose}>
        <BottomSheetHeader onClose={close}>{title}</BottomSheetHeader>
        <ScrollView contentContainerStyle={tw.style('px-4 pb-6')}>
          {options.map((option) => (
            <ListItemSelect
              key={option.value}
              title={option.label}
              variant={ListItemVariant.OneLine}
              isSelected={value === option.value}
              showSelectedIcon
              onPress={() => {
                onSelect(option.value);
                close();
              }}
              accessibilityState={{ selected: value === option.value }}
              testID={`collectibles-option-${option.value}`}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </CollectiblesSheetModal>
  );
}
