import React, { useRef, useCallback, useMemo } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  ListItemSelect,
  Tag,
  TagSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import type {
  PerpsProviderSelectorSheetProps,
  ProviderNetworkOption,
} from './PerpsProviderSelector.types';
import { PROVIDER_NETWORK_OPTIONS } from './PerpsProviderSelector.constants';

/**
 * PerpsProviderSelectorSheet Component
 *
 * Bottom sheet for selecting between available perps provider + network combinations.
 */
const PerpsProviderSelectorSheet: React.FC<PerpsProviderSelectorSheetProps> = ({
  onClose,
  selectedOptionId,
  onOptionSelect,
  testID,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { availableProviders } = usePerpsProvider();

  const filteredOptions = useMemo(
    () =>
      PROVIDER_NETWORK_OPTIONS.filter((opt) =>
        availableProviders.includes(opt.providerId),
      ),
    [availableProviders],
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleOptionPress = useCallback(
    async (option: ProviderNetworkOption) => {
      await onOptionSelect(option);
      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [onOptionSelect],
  );

  return (
    <BottomSheet ref={bottomSheetRef} goBack={onClose} testID={testID}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('perps.provider_selector.title')}
      </BottomSheetHeader>
      {filteredOptions.map((option) => {
        const isSelected = selectedOptionId === option.id;

        return (
          <ListItemSelect
            key={option.id}
            title={option.name}
            description={option.description}
            titleEndAccessory={
              <Tag
                severity={
                  option.isTestnet ? TagSeverity.Warning : TagSeverity.Neutral
                }
                twClassName="self-center"
              >
                {option.network}
              </Tag>
            }
            isSelected={isSelected}
            showSelectedIcon
            onPress={() => handleOptionPress(option)}
            testID={testID ? `${testID}-option-${option.id}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          />
        );
      })}
    </BottomSheet>
  );
};

export default PerpsProviderSelectorSheet;
