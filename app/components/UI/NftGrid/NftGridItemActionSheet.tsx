import React from 'react';
import { Nft } from '@metamask/assets-controllers';
import { Alert } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { useTheme } from '../../../util/theme';
import { toHex } from '@metamask/controller-utils';

const NftGridItemActionSheet = ({
  actionSheetRef,
  longPressedCollectible,
}: {
  actionSheetRef: React.RefObject<typeof ActionSheet>;
  longPressedCollectible: Nft | null;
}) => {
  const { themeAppearance } = useTheme();

  const getNetworkClientIdForNft = (nft: Nft) => {
    if (!nft.chainId) return undefined;
    const { NetworkController } = Engine.context;
    return NetworkController.findNetworkClientIdByChainId(toHex(nft.chainId));
  };

  const removeNft = () => {
    if (!longPressedCollectible) return;

    const { NftController } = Engine.context;
    const networkClientId = getNetworkClientIdForNft(longPressedCollectible);

    if (!networkClientId) return;

    NftController.removeAndIgnoreNft(
      longPressedCollectible.address,
      longPressedCollectible.tokenId,
      networkClientId,
    );

    Alert.alert(
      strings('wallet.collectible_removed_title'),
      strings('wallet.collectible_removed_desc'),
    );
  };

  const refreshMetadata = () => {
    if (!longPressedCollectible) return;

    const { NftController } = Engine.context;
    const networkClientId = getNetworkClientIdForNft(longPressedCollectible);

    if (!networkClientId) return;

    NftController.addNft(
      longPressedCollectible.address,
      longPressedCollectible.tokenId,
      networkClientId,
    );
  };

  const handleMenuAction = (index: number) => {
    if (index === 1) {
      removeNft();
    } else if (index === 0) {
      refreshMetadata();
    }
  };

  return (
    <ActionSheet
      ref={actionSheetRef}
      title={strings('wallet.collectible_action_title')}
      options={[
        strings('wallet.refresh_metadata'),
        strings('wallet.remove'),
        strings('wallet.cancel'),
      ]}
      cancelButtonIndex={2}
      destructiveButtonIndex={1}
      onPress={handleMenuAction}
      theme={themeAppearance}
    />
  );
};

export default NftGridItemActionSheet;
