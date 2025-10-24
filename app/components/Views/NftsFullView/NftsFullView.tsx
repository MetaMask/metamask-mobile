import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import BaseControlBar from '../../UI/shared/BaseControlBar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { Box } from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../locales/i18n';
import NftGrid from '../../UI/NftGrid/NftGrid';
import { FlashListProps } from '@shopify/flash-list';
import { Nft } from '@metamask/assets-controllers';

interface NFTNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftsFullViewProps {
  flashListProps?: Partial<FlashListProps<Nft[]>>;
}

const NftsFullView = ({
  flashListProps: _flashListProps,
}: NftsFullViewProps) => {
  const navigation =
    useNavigation<StackNavigationProp<NFTNavigationParamList, 'AddAsset'>>();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();

  const goToAddCollectible = useCallback(() => {
    navigation.push('AddAsset', { assetType: 'collectible' });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES).build(),
    );
  }, [navigation, trackEvent, createEventBuilder]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const additionalButtons = (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={goToAddCollectible}
      iconName={IconName.Add}
    />
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
      <BottomSheetHeader onBack={handleBackPress}>
        {strings('wallet.collectibles')}
      </BottomSheetHeader>
      <Box twClassName="flex-1">
        <BaseControlBar
          networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
          useEvmSelectionLogic={false}
          customWrapper="none"
          additionalButtons={additionalButtons}
          hideSort
          style={tw`px-4 pb-4`}
        />
        <NftGrid
          onAddCollectible={goToAddCollectible}
          flashListProps={{
            contentContainerStyle: tw`px-4`,
            scrollEnabled: true,
          }}
        />
      </Box>
    </SafeAreaView>
  );
};

export default NftsFullView;
