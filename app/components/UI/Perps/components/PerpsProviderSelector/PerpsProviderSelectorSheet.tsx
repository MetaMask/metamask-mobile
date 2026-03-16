import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import type {
  PerpsProviderSelectorSheetProps,
  ProviderNetworkOption,
} from './PerpsProviderSelector.types';
import { PROVIDER_NETWORK_OPTIONS } from './PerpsProviderSelector.constants';
import { styleSheet } from './PerpsProviderSelector.styles';

/**
 * PerpsProviderSelectorSheet Component
 *
 * Bottom sheet for selecting between available perps provider + network combinations.
 */
const PerpsProviderSelectorSheet: React.FC<PerpsProviderSelectorSheetProps> = ({
  isVisible,
  onClose,
  selectedOptionId,
  onOptionSelect,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { availableProviders } = usePerpsProvider();

  const filteredOptions = useMemo(
    () =>
      PROVIDER_NETWORK_OPTIONS.filter((opt) =>
        availableProviders.includes(opt.providerId),
      ),
    [availableProviders],
  );

  useEffect(() => {
    const sheet = bottomSheetRef.current;
    if (isVisible) {
      sheet?.onOpenBottomSheet();
    } else {
      sheet?.onCloseBottomSheet();
    }

    return () => {
      sheet?.onCloseBottomSheet();
    };
  }, [isVisible]);

  const handleOptionPress = useCallback(
    async (option: ProviderNetworkOption) => {
      await onOptionSelect(option);
      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [onOptionSelect],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      isFullscreen={false}
      testID={testID}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.provider_selector.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.optionsList}>
        {filteredOptions.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              activeOpacity={0.7}
              onPress={() => handleOptionPress(option)}
              testID={testID ? `${testID}-option-${option.id}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionNameRow}>
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={styles.optionName}
                  >
                    {option.name}
                  </Text>
                  {option.isTestnet ? (
                    <View style={styles.testnetTag}>
                      <View style={styles.testnetDot} />
                      <Text
                        variant={TextVariant.BodyXS}
                        color={TextColor.Warning}
                      >
                        {option.network}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      variant={TextVariant.BodyXS}
                      color={TextColor.Alternative}
                    >
                      {option.network}
                    </Text>
                  )}
                </View>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {option.description}
                </Text>
              </View>
              {isSelected && (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.Primary}
                  style={styles.checkIcon}
                  testID={testID ? `${testID}-check-${option.id}` : undefined}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
};

export default PerpsProviderSelectorSheet;
