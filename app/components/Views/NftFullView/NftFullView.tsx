import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import NftGrid from '../../UI/NftGrid/NftGrid';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { selectHomeBrandRefreshSurfacesEnabled } from '../../../selectors/featureFlagController/homeBrandRefreshSurfaces';

const NftFullView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const isGlassHeader =
    useSelector(selectHomeBrandRefreshSurfacesEnabled) === true;

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default pb-4', { paddingTop: insets.top })}
      edges={['left', 'right', 'bottom']}
    >
      {isGlassHeader ? (
        <HeaderStandardGlass
          isGlass
          isFloating={false}
          title={strings('wallet.collectibles')}
          onBack={handleBackPress}
          backButtonProps={{ testID: 'back-button' }}
        />
      ) : (
        <Box twClassName="flex-row items-center h-14 px-2">
          <ButtonIcon
            size={ButtonIconSize.Md}
            iconName={IconName.ArrowLeft}
            onPress={handleBackPress}
            testID="back-button"
          />
          <Box
            twClassName="absolute inset-0 items-center justify-center"
            pointerEvents="none"
          >
            <Text variant={TextVariant.HeadingSm}>
              {strings('wallet.collectibles')}
            </Text>
          </Box>
        </Box>
      )}
      <Box twClassName="flex-1">
        <NftGrid isFullView />
      </Box>
    </SafeAreaView>
  );
};

export default NftFullView;
