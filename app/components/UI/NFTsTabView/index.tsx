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
import { Box } from '@metamask/design-system-react-native';
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

  const additionalButtons = (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={goToAddCollectible}
      iconName={IconName.Add}
    />
  );

  return (
    <Box twClassName="flex-1 pb-9">
      <BaseControlBar
        networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
        useEvmSelectionLogic={false}
        customWrapper="outer"
        additionalButtons={additionalButtons}
        hideSort
        style={tw`pb-3`}
      />
      <NftGrid
        onAddCollectible={goToAddCollectible}
        flashListProps={flashListProps}
      />
    </Box>
  );
};

export default NFTsTabView;
