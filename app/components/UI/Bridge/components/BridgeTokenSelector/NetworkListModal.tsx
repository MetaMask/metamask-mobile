import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler'; // Must use this to make sure scroll works inside a bottom sheet on Android
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Icon, IconName, IconSize } from '@metamask/design-system-react-native';
import { IconName as ComponentLibraryIconName } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { CaipChainId } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../../util/networks';
import type { RootState } from '../../../../../reducers';
import {
  selectAllowedChainRanking,
  selectOrdersNetworkFilter,
  selectTokenSelectorNetworkFilter,
  setOrdersNetworkFilter,
  setTokenSelectorNetworkFilter,
} from '../../../../../core/redux/slices/bridge';
import { useABTest } from '../../../../../hooks';
import { useChainValueOrder } from '../../hooks/useChainValueOrder';
import {
  CHAIN_VALUE_ORDER_AB_KEY,
  CHAIN_VALUE_ORDER_EXPOSURE_METADATA,
  CHAIN_VALUE_ORDER_VARIANTS,
} from './abTestConfig';

interface ChainRankingEntry {
  chainId: CaipChainId;
  name: string;
}

export type NetworkListModalFilterTarget = 'tokenSelector' | 'orders';

export interface NetworkListModalParams {
  /**
   * When provided, restricts the network list to these chains instead
   * of the default allowed chainRanking.
   */
  enabledChainIds?: CaipChainId[];
  /**
   * Which Redux network filter this modal reads and writes.
   * Defaults to the token selector filter.
   */
  filterTarget?: NetworkListModalFilterTarget;
}

interface NetworkListModalContentProps {
  chainRanking: ChainRankingEntry[];
  filterTarget: NetworkListModalFilterTarget;
}

const NetworkListModalContent: React.FC<NetworkListModalContentProps> = ({
  chainRanking,
  filterTarget,
}) => {
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);

  const tokenSelectorFilter = useSelector(selectTokenSelectorNetworkFilter);
  const ordersFilter = useSelector(selectOrdersNetworkFilter);
  const selectedChainId =
    filterTarget === 'orders' ? ordersFilter : tokenSelectorFilter;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleNetworkPress = useCallback(
    (chainId?: CaipChainId) => {
      dispatch(
        filterTarget === 'orders'
          ? setOrdersNetworkFilter(chainId)
          : setTokenSelectorNetworkFilter(chainId),
      );
      sheetRef.current?.onCloseBottomSheet();
    },
    [dispatch, filterTarget],
  );

  const isAllSelected = !selectedChainId;

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('bridge.select_network')}
      </BottomSheetHeader>
      <ScrollView testID="network-list-modal-scroll">
        {/* All networks option */}
        <Cell
          variant={CellVariant.Select}
          title={strings('bridge.all_networks')}
          isSelected={isAllSelected}
          onPress={() => handleNetworkPress(undefined)}
          avatarProps={{
            variant: AvatarVariant.Icon,
            name: ComponentLibraryIconName.Global,
            size: AvatarSize.Sm,
          }}
          testID="network-option-all"
        >
          {isAllSelected && <Icon name={IconName.Check} size={IconSize.Md} />}
        </Cell>

        {chainRanking.map((chain: { chainId: CaipChainId; name: string }) => {
          const isSelected = selectedChainId === chain.chainId;
          return (
            <Cell
              key={chain.chainId}
              variant={CellVariant.Select}
              title={chain.name}
              isSelected={isSelected}
              onPress={() => handleNetworkPress(chain.chainId)}
              avatarProps={{
                variant: AvatarVariant.Network,
                name: chain.name,
                imageSource: getNetworkImageSource({
                  chainId: chain.chainId,
                }),
                size: AvatarSize.Sm,
              }}
              testID={`network-option-${chain.chainId}`}
            >
              {isSelected && <Icon name={IconName.Check} size={IconSize.Md} />}
            </Cell>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

const NetworkValueOrderedListModal: React.FC<NetworkListModalContentProps> = ({
  chainRanking,
  filterTarget,
}) => {
  const orderedChainRanking = useChainValueOrder(chainRanking);

  return (
    <NetworkListModalContent
      chainRanking={orderedChainRanking}
      filterTarget={filterTarget}
    />
  );
};

const NetworkListModal: React.FC = () => {
  const route =
    useRoute<RouteProp<{ params: NetworkListModalParams }, 'params'>>();
  const enabledChainIds = route.params?.enabledChainIds;
  const filterTarget = route.params?.filterTarget ?? 'tokenSelector';
  const chainRanking: ChainRankingEntry[] = useSelector((state: RootState) =>
    selectAllowedChainRanking(state, enabledChainIds),
  );
  const { variant } = useABTest(
    CHAIN_VALUE_ORDER_AB_KEY,
    CHAIN_VALUE_ORDER_VARIANTS,
    CHAIN_VALUE_ORDER_EXPOSURE_METADATA,
  );

  if (variant.orderByValue) {
    return (
      <NetworkValueOrderedListModal
        chainRanking={chainRanking}
        filterTarget={filterTarget}
      />
    );
  }

  return (
    <NetworkListModalContent
      chainRanking={chainRanking}
      filterTarget={filterTarget}
    />
  );
};

export default NetworkListModal;
