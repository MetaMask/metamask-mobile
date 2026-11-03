import React, { useCallback, useRef } from 'react';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useParams } from '../../../../../util/navigation/navUtils';
import NetworkOptionCells from '../../../../UI/Trending/components/NetworkOptionCells/NetworkOptionCells';
import { TRENDING_NETWORKS_LIST } from '../../../../UI/Trending/utils/trendingNetworksList';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';

export interface TokenNetworkFilterSheetParams {
  /** Current filter. `null` means all networks. */
  selectedNetwork: CaipChainId | null;
  onSelect: (chainId: CaipChainId | null) => void;
}

/**
 * Network filter for Import tokens. A route-based sheet, so its backdrop sits
 * above the whole screen (header included) instead of inside a content area.
 */
const NetworkFilterSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { selectedNetwork, onSelect } =
    useParams<TokenNetworkFilterSheetParams>();

  const close = useCallback(() => sheetRef.current?.onCloseBottomSheet(), []);

  const select = useCallback(
    (chainIds: CaipChainId[] | null) => {
      sheetRef.current?.onCloseBottomSheet(() =>
        onSelect?.(chainIds ? chainIds[0] : null),
      );
    },
    [onSelect],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      testID={ImportTokenViewSelectorsIDs.NETWORK_FILTER_SHEET}
    >
      <HeaderStandard
        title={strings('trending.networks')}
        onClose={close}
        closeButtonProps={{ testID: 'close-button' }}
      />
      <ScrollView>
        <NetworkOptionCells
          networks={TRENDING_NETWORKS_LIST}
          allLabel={strings('wallet.popular_networks')}
          selectedChainIds={selectedNetwork ? [selectedNetwork] : null}
          onSelect={select}
        />
      </ScrollView>
    </BottomSheet>
  );
};

export default NetworkFilterSheet;
