import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../locales/i18n';
import { Box } from '@metamask/design-system-react-native';
import NftGrid from '../../UI/NftGrid/NftGrid';

const NftFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
      <BottomSheetHeader onBack={handleBackPress}>
        {strings('wallet.collectibles')}
      </BottomSheetHeader>
      <Box twClassName="flex-1">
        <NftGrid isFullView />
      </Box>
    </SafeAreaView>
  );
};

export default NftFullView;
