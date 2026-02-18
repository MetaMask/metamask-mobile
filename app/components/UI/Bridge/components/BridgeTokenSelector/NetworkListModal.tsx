import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
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
import {
  selectAllowedChainRanking,
  selectTokenSelectorNetworkFilter,
  setTokenSelectorNetworkFilter,
} from '../../../../../core/redux/slices/bridge';

const NetworkListModal: React.FC = () => {
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);

  const chainRanking = useSelector(selectAllowedChainRanking);
  const selectedChainId = useSelector(selectTokenSelectorNetworkFilter);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleNetworkPress = useCallback(
    (chainId?: CaipChainId) => {
      dispatch(setTokenSelectorNetworkFilter(chainId));
      sheetRef.current?.onCloseBottomSheet();
    },
    [dispatch],
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

export default NetworkListModal;
