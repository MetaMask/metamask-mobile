import React, { useCallback } from 'react';
import { View, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import { selectPerpsNetwork } from '../../selectors/perpsController';
import { PerpsProviderSelectorBadge } from '../PerpsProviderSelector';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import type { PerpsHomeHeaderProps } from './PerpsHomeHeader.types';
import styleSheet from './PerpsHomeHeader.styles';

type PerpsHomeHeaderTitleSegmentProps = Readonly<
  Pick<PerpsHomeHeaderProps, 'screenTitle' | 'testID'>
>;

function PerpsHomeHeaderTitleSegment({
  screenTitle,
  testID,
}: PerpsHomeHeaderTitleSegmentProps) {
  const { styles } = useStyles(styleSheet, {});
  const { isMultiProviderEnabled } = usePerpsProvider();
  const network = useSelector(selectPerpsNetwork);
  const isTestnet = network === 'testnet';

  return (
    <Box paddingTop={2} testID={testID}>
      <Box twClassName="px-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName={
            isMultiProviderEnabled
              ? 'w-full flex-nowrap'
              : 'w-full flex-wrap gap-y-1'
          }
        >
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            testID={testID ? `${testID}-title` : undefined}
          >
            {screenTitle ?? strings('perps.title')}
          </Text>
          {isMultiProviderEnabled && (
            <Box twClassName="ml-auto flex-shrink-0">
              <PerpsProviderSelectorBadge
                testID={testID ? `${testID}-provider-badge` : undefined}
              />
            </Box>
          )}
          {isTestnet && !isMultiProviderEnabled && (
            <View
              style={styles.testnetBadge}
              testID={testID ? `${testID}-testnet-badge` : undefined}
            >
              <View style={styles.testnetDot} />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.WarningDefault}
              >
                Testnet
              </Text>
            </View>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Perps home: top nav (`HeaderStandard` / search) or scroll title row (`segment="title"`).
 */
const PerpsHomeHeader: React.FC<PerpsHomeHeaderProps> = ({
  segment = 'nav',
  screenTitle,
  isSearchVisible = false,
  searchQuery = '',
  onSearchQueryChange,
  onSearchClear,
  onBack,
  onSearchToggle,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const defaultHandleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleBack = onBack || defaultHandleBack;

  if (segment === 'title') {
    return (
      <PerpsHomeHeaderTitleSegment screenTitle={screenTitle} testID={testID} />
    );
  }

  if (isSearchVisible) {
    return (
      <View style={styles.header} testID={testID}>
        <View style={styles.headerContainerWrapper}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            style={styles.searchBarContainer}
            twClassName="flex-1 bg-muted rounded-lg px-3 py-1 mr-2"
          >
            <Icon
              name={IconName.Search}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
              style={tw.style('mr-2')}
            />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchQueryChange}
              placeholder={strings('perps.search_by_token_symbol')}
              placeholderTextColor={colors.text.muted}
              autoFocus
              style={tw.style('flex-1 text-base text-default')}
              testID={testID ? `${testID}-search-bar` : undefined}
            />
            {searchQuery.length > 0 && onSearchClear && (
              <Pressable
                onPress={onSearchClear}
                testID={testID ? `${testID}-search-clear` : undefined}
              >
                <Icon
                  name={IconName.CircleX}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
              </Pressable>
            )}
          </Box>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={onSearchToggle}
            testID={testID ? `${testID}-search-close` : undefined}
          >
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {strings('perps.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <HeaderStandard
      testID={testID}
      onBack={handleBack}
      backButtonProps={{
        accessibilityLabel: 'Back',
        testID: testID ? `${testID}-back-button` : undefined,
      }}
      endButtonIconProps={[
        {
          iconName: IconName.Search,
          onPress: onSearchToggle,
          accessibilityLabel: 'Search',
          testID: testID ? `${testID}-search-toggle` : undefined,
        },
      ]}
    />
  );
};

export default PerpsHomeHeader;
