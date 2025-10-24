import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import BaseControlBar from '../shared/BaseControlBar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  Box,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Button,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { strings } from '../../../../locales/i18n';
import NftGrid from '../NftGrid/NftGrid';
import { FlashListProps } from '@shopify/flash-list';
import { Nft } from '@metamask/assets-controllers';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface NFTNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NFTsProps {
  flashListProps?: Partial<FlashListProps<Nft[]>>;
}

const NFTsTabView = ({ flashListProps }: NFTsProps) => {
  const navigation =
    useNavigation<StackNavigationProp<NFTNavigationParamList, 'AddAsset'>>();
  const { trackEvent, createEventBuilder } = useMetrics();

  const goToAddCollectible = useCallback(() => {
    navigation.push('AddAsset', { assetType: 'collectible' });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES).build(),
    );
  }, [navigation, trackEvent, createEventBuilder]);
  const tw = useTailwind();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigateToNftsFullView = useCallback(() => {
    navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
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
    <Box twClassName="flex-1">
      <BaseControlBar
        networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
        useEvmSelectionLogic={false}
        customWrapper="outer"
        additionalButtons={additionalButtons}
        hideSort
        style={tw`pb-3`}
      />
      {/* Uncomment this to review NftsFullView */}
      {/* <Box twClassName="px-4 py-2">
        <Button
          variant={ButtonVariant.Secondary}
          onPress={navigateToNftsFullView}
        >
          {strings('wallet.view_all_nfts')}
        </Button>
      </Box> */}
      <NftGrid
        onAddCollectible={goToAddCollectible}
        flashListProps={flashListProps}
      />
    </Box>
  );
};

export default NFTsTabView;
