import React, { memo } from 'react';
import { Image } from 'expo-image';
import {
  FilterButton,
  FilterButtonGroup,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { ChainOption } from '../hooks/useChainDisplayInfos';

export interface QuickBuyPayWithChainFilterProps {
  chains: ChainOption[];
  selectedChainId: string | null;
  onSelect: (chainId: string | null) => void;
  testID?: string;
}

const getChainChipKey = (chainId: string | null): string => chainId ?? 'all';

const getChainFilterTestId = (key: string): string =>
  `quick-buy-chain-filter-${key}`;

const QuickBuyPayWithChainFilter: React.FC<QuickBuyPayWithChainFilterProps> = ({
  chains,
  selectedChainId,
  onSelect,
  testID = 'quick-buy-pay-with-chain-filter',
}) => {
  const tw = useTailwind();

  if (chains.length === 0) {
    return null;
  }

  return (
    <FilterButtonGroup
      value={getChainChipKey(selectedChainId)}
      onChange={(key) => onSelect(key === 'all' ? null : key)}
      twClassName="px-4 gap-2 pb-3"
      testID={testID}
    >
      {chains.map((chain) => {
        const key = getChainChipKey(chain.chainId);
        return (
          <FilterButton
            key={key}
            value={key}
            startAccessory={
              chain.imageSource ? (
                <Image
                  source={chain.imageSource}
                  style={tw.style('size-4 rounded')}
                />
              ) : undefined
            }
            testID={getChainFilterTestId(key)}
          >
            {chain.name}
          </FilterButton>
        );
      })}
    </FilterButtonGroup>
  );
};

export default memo(QuickBuyPayWithChainFilter);
