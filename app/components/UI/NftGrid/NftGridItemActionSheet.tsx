import React from 'react';
import { Nft } from '@metamask/assets-controllers';
import { Alert } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';

import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { AppThemeKey } from '../../../util/theme/models';

const NftGridItemActionSheet = ({
  chainId,
  actionSheetRef,
  themeAppearance,
  longPressedCollectible,
  selectedNetworkClientId,
}: {
  chainId: SupportedCaipChainId | `0x${string}`;
  actionSheetRef: React.RefObject<typeof ActionSheet>;
  themeAppearance: AppThemeKey.light | AppThemeKey.dark;
  longPressedCollectible: Nft | null;
  selectedNetworkClientId: string;
}) => {
  const { trackEvent, createEventBuilder } = useMetrics();

  const removeNft = () => {
    if (!longPressedCollectible) return;

    const { NftController } = Engine.context;

    NftController.removeAndIgnoreNft(
      longPressedCollectible.address,
      longPressedCollectible.tokenId,
      selectedNetworkClientId,
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.COLLECTIBLE_REMOVED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
    Alert.alert(
      strings('wallet.collectible_removed_title'),
      strings('wallet.collectible_removed_desc'),
    );
  };

  const refreshMetadata = () => {
    if (!longPressedCollectible) return;

    const { NftController } = Engine.context;

    NftController.addNft(
      longPressedCollectible.address,
      longPressedCollectible.tokenId,
      selectedNetworkClientId,
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
      // eslint-disable-next-line react/jsx-no-bind
      onPress={handleMenuAction}
      theme={themeAppearance}
    />
  );
};

export default NftGridItemActionSheet;
