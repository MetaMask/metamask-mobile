import React, { memo, useMemo } from 'react';
import PredictChipList from '../../../../../../UI/Predict/components/PredictChipList/PredictChipList';
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
  const chips = useMemo(
    () =>
      chains.map((chain) => ({
        key: getChainChipKey(chain.chainId),
        label: chain.name,
        imageSource: chain.imageSource,
      })),
    [chains],
  );

  return (
    <PredictChipList
      chips={chips}
      activeChipKey={getChainChipKey(selectedChainId)}
      onChipSelect={(key) => onSelect(key === 'all' ? null : key)}
      testID={testID}
      containerTwClassName="pb-3"
      chipTwClassName="rounded-lg px-3 py-1.5 mb-3"
      getChipTestId={getChainFilterTestId}
      useGestureHandlerScrollView
    />
  );
};

export default memo(QuickBuyPayWithChainFilter);
