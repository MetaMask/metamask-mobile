import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import AddCustomCollectible from '../../components/AddCustomCollectible/AddCustomCollectible';
import { selectDisplayNftMedia } from '../../../../../selectors/preferencesController';
import Banner from '../../../../../component-library/components/Banners/Banner/Banner';
import {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import {
  MultichainNetworkConfiguration,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { Box } from '@metamask/design-system-react-native';
import NetworkSelector from '../../components/NetworkSelector/NetworkSelector';
import { AddAssetParams } from '../../AddAsset';

interface NFTViewProps {
  collectibleContract: AddAssetParams['collectibleContract'];
  selectedNetwork: SupportedCaipChainId | Hex | null;
  openNetworkSelector: () => void;
  networkConfigurations: Record<string, MultichainNetworkConfiguration>;
}

const NFTView = ({
  collectibleContract,
  selectedNetwork,
  openNetworkSelector,
  networkConfigurations,
}: NFTViewProps) => {
  const navigation = useNavigation();
  const displayNftMedia = useSelector(selectDisplayNftMedia);

  const goToSecuritySettings = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA,
    });
  };

  return (
    <>
      <Box twClassName="items-center pt-4 px-4" testID="add-asset-nft-banner">
        <Banner
          variant={BannerVariant.Alert}
          description={
            !displayNftMedia ? (
              <>
                <Text variant={TextVariant.BodyMD}>
                  {strings('wallet.display_nft_media_cta_new_1')}
                  <Text variant={TextVariant.BodyMDBold}>
                    {' '}
                    {strings('wallet.display_nft_media_cta_new_2')}
                  </Text>
                </Text>
              </>
            ) : (
              <Text
                variant={TextVariant.BodyMD}
                testID={'warning-display-media-enabled-text'}
              >
                {strings('wallet.display_media_nft_warning')}
              </Text>
            )
          }
          severity={
            !displayNftMedia
              ? BannerAlertSeverity.Info
              : BannerAlertSeverity.Warning
          }
          actionButtonProps={
            !displayNftMedia
              ? {
                  variant: ButtonVariants.Link,
                  onPress: goToSecuritySettings,
                  label: strings('wallet.display_nft_media_cta'),
                }
              : undefined
          }
        />
      </Box>

      <NetworkSelector
        selectedNetwork={selectedNetwork}
        openNetworkSelector={openNetworkSelector}
        networkConfigurations={networkConfigurations}
      />

      {selectedNetwork && !isNonEvmChainId(selectedNetwork) && (
        <AddCustomCollectible
          navigation={navigation}
          collectibleContract={collectibleContract}
          selectedNetwork={
            selectedNetwork
              ? networkConfigurations?.[selectedNetwork as Hex]?.name
              : null
          }
          networkClientId={
            selectedNetwork
              ? (Engine.context.NetworkController.state
                  ?.networkConfigurationsByChainId?.[selectedNetwork as Hex]
                  ?.rpcEndpoints?.[
                  Engine.context.NetworkController.state
                    ?.networkConfigurationsByChainId?.[selectedNetwork as Hex]
                    ?.defaultRpcEndpointIndex ?? 0
                ]?.networkClientId ?? null)
              : null
          }
        />
      )}
    </>
  );
};

export default NFTView;
