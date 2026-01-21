import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Image, View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import createStyles from './PerpsProviderSelector.styles';
import type { PerpsProviderSelectorSheetProps } from './PerpsProviderSelector.types';
import type { PerpsProviderType } from '../../controllers/types';

/**
 * Bottom sheet displaying available providers for selection
 */
const PerpsProviderSelectorSheet: React.FC<PerpsProviderSelectorSheetProps> = ({
  onClose,
  providers,
  activeProvider,
  onSelectProvider,
  sheetRef: externalSheetRef,
  testID,
}) => {
  const { styles } = useStyles(createStyles, {});
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  const handleSelectProvider = useCallback(
    (providerId: PerpsProviderType) => {
      onSelectProvider(providerId);
    },
    [onSelectProvider],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID}
    >
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.provider_selector.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.sheetContainer}>
        {providers.map((provider) => {
          const isSelected = provider.id === activeProvider;
          return (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerRow,
                isSelected && styles.providerRowSelected,
              ]}
              onPress={() => handleSelectProvider(provider.id)}
              disabled={!provider.enabled}
              testID={testID ? `${testID}-${provider.id}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${provider.name} on ${provider.chain} with ${provider.collateralSymbol} collateral`}
            >
              {provider.iconUrl && (
                <Image
                  source={{ uri: provider.iconUrl }}
                  style={styles.providerIcon}
                  resizeMode="contain"
                />
              )}
              <View style={styles.providerInfo}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Default}
                  style={styles.providerName}
                >
                  {provider.name}
                </Text>
                <View style={styles.providerDetails}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                    style={styles.providerChain}
                  >
                    {provider.chain}
                  </Text>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    · {provider.collateralSymbol}
                  </Text>
                </View>
              </View>
              {isSelected && (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.Primary}
                  style={styles.checkmark}
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
