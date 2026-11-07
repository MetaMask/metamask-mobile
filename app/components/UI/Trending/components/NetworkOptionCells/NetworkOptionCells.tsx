import React from 'react';
import { CaipChainId } from '@metamask/utils';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';

interface NetworkOptionCellsProps {
  networks: Pick<ProcessedNetwork, 'caipChainId' | 'name' | 'imageSource'>[];
  /** Label of the "all networks" row. Omit to hide the row. */
  allLabel?: string;
  /** Selected networks. `null` means all networks. */
  selectedChainIds: CaipChainId[] | null;
  /** Called with the chosen network, or `null` for all networks. */
  onSelect: (chainIds: CaipChainId[] | null) => void;
}

/** Selectable rows for an "all networks" option plus a list of networks. */
const NetworkOptionCells = ({
  networks,
  allLabel,
  selectedChainIds,
  onSelect,
}: NetworkOptionCellsProps) => {
  const isAllSelected = !selectedChainIds;

  return (
    <>
      {allLabel ? (
        <Cell
          variant={CellVariant.Select}
          title={allLabel}
          isSelected={isAllSelected}
          onPress={() => onSelect(null)}
          avatarProps={{
            variant: AvatarVariant.Icon,
            name: IconName.Global,
            size: AvatarSize.Sm,
          }}
        >
          {isAllSelected && <Icon name={IconName.Check} size={IconSize.Md} />}
        </Cell>
      ) : null}
      {networks.map((network) => {
        const isSelected =
          !isAllSelected && selectedChainIds.includes(network.caipChainId);
        return (
          <Cell
            testID={`network-select-${network.caipChainId}`}
            key={network.caipChainId}
            variant={CellVariant.Select}
            title={network.name}
            isSelected={isSelected}
            onPress={() => onSelect([network.caipChainId])}
            avatarProps={{
              variant: AvatarVariant.Network,
              name: network.name,
              imageSource: network.imageSource,
              size: AvatarSize.Sm,
            }}
          >
            {isSelected && <Icon name={IconName.Check} size={IconSize.Md} />}
          </Cell>
        );
      })}
    </>
  );
};

export default NetworkOptionCells;
