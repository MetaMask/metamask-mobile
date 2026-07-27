import React, { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import ListItem from '../../../../../component-library/components/List/ListItem';
import Routes from '../../../../../constants/navigation/Routes';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { FlashList } from '@shopify/flash-list';
import {
  Box,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ImportAsset } from '../../utils/utils';
import AddAssetTokenRow from '../../components/AddAssetTokenRow/AddAssetTokenRow';
import Logger from '../../../../../util/Logger';

const ConfirmAddAsset = () => {
  const { selectedAsset, networkName, addTokenList } = useParams<{
    selectedAsset: ImportAsset[];
    networkName: string;
    addTokenList: () => Promise<void>;
  }>();

  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Go to wallet page
   */
  const goToWalletPage = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

  const handleImport = useCallback(async () => {
    if (isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      await addTokenList();
      goToWalletPage();
    } catch (error) {
      Logger.error(error as Error, 'ConfirmAddAsset: failed to import tokens');
      setIsImporting(false);
    }
  }, [addTokenList, goToWalletPage, isImporting]);

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET}
    >
      <HeaderStandard
        title={strings('add_asset.title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />

      <Box twClassName="flex-1 pt-2">
        <Text variant={TextVariant.BodyMd} style={tw.style('text-center px-4')}>
          {selectedAsset.length > 1
            ? strings('wallet.import_tokens')
            : strings('wallet.import_token')}
        </Text>

        <FlashList
          data={selectedAsset}
          style={tw.style('flex-1 bg-default')}
          contentContainerStyle={tw.style('pt-6 px-6 pb-4')}
          renderItem={({ item: asset, index }) => (
            <ListItem key={index} gap={20} style={tw.style('p-0')}>
              <AddAssetTokenRow asset={asset} networkName={networkName} />
            </ListItem>
          )}
          keyExtractor={(_, index) => `token-search-row-${index}`}
        />
      </Box>

      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: () => navigation.goBack(),
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            isDisabled: isImporting,
          },
          {
            onPress: handleImport,
            label: strings('swaps.Import'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            loading: isImporting,
            isDisabled: isImporting,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
        style={tw.style('px-4 pt-4', Platform.OS !== 'android' && 'pb-4')}
      />
    </SafeAreaView>
  );
};
export default ConfirmAddAsset;
