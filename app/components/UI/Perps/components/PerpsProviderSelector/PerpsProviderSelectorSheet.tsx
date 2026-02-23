import React, { useRef, useEffect, useCallback } from 'react';
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
import type { PerpsProviderSelectorSheetProps } from './PerpsProviderSelector.types';
import { PROVIDER_DISPLAY_INFO } from './PerpsProviderSelector.constants';
import { styleSheet } from './PerpsProviderSelector.styles';
import type { PerpsProviderType } from '@metamask/perps-controller';

/**
 * PerpsProviderSelectorSheet Component
 *
 * Bottom sheet for selecting between available perps providers.
 *
 * @example
 * ```tsx
 * <PerpsProviderSelectorSheet
 *   isVisible={showSheet}
 *   onClose={() => setShowSheet(false)}
 *   selectedProvider="hyperliquid"
 *   onProviderSelect={handleProviderSelect}
 * />
 * ```
 */
const PerpsProviderSelectorSheet: React.FC<PerpsProviderSelectorSheetProps> = ({
  isVisible,
  onClose,
  selectedProvider,
  onProviderSelect,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { availableProviders } = usePerpsProvider();

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

  const handleProviderPress = useCallback(
    async (providerId: PerpsProviderType) => {
      await onProviderSelect(providerId);
      // Just close the sheet - the BottomSheet's onClose prop handles navigation
      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [onProviderSelect],
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
        {availableProviders.map((providerId) => {
          const providerInfo = PROVIDER_DISPLAY_INFO[providerId];
          const isSelected = selectedProvider === providerId;

          return (
            <TouchableOpacity
              key={providerId}
              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              activeOpacity={0.7}
              onPress={() => handleProviderPress(providerId)}
              testID={testID ? `${testID}-option-${providerId}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.optionContent}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  style={styles.optionName}
                >
                  {providerInfo.name}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {providerInfo.description}
                </Text>
              </View>
              {isSelected && (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.Primary}
                  style={styles.checkIcon}
                  testID={testID ? `${testID}-check-${providerId}` : undefined}
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
