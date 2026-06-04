import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
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

const NftFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default pb-4', { paddingTop: insets.top })}
      edges={['left', 'right', 'bottom']}
    >
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
      <Box twClassName="flex-1">
        <NftGrid isFullView />
      </Box>
    </SafeAreaView>
  );
};

export default NftFullView;
