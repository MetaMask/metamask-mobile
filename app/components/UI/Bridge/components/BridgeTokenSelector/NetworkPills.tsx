import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { selectEnabledChainRanking } from '../../../../../core/redux/slices/bridge';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';
import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize } from '../../../../../component-library/components/Buttons/Button';

const PILL_WIDTH = 90; // Average pill width including gap

interface NetworkPillsProps {
  selectedChainId?: CaipChainId;
  onChainSelect: (chainId?: CaipChainId) => void;
}

export const NetworkPills: React.FC<NetworkPillsProps> = ({
  selectedChainId,
  onChainSelect,
}) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);
  const chainRanking = useSelector(selectEnabledChainRanking);

  // Auto-scroll to selected network on initial layout
  const handleContentSizeChange = () => {
    if (hasScrolledRef.current || !selectedChainId) return;

    const selectedIndex = chainRanking.findIndex(
      (chain: { chainId: CaipChainId }) => chain.chainId === selectedChainId,
    );

    // Only scroll if the selected network is beyond the first 2 visible networks
    // The first few networks are already visible, no need to scroll
    if (selectedIndex > 1) {
      // Scroll to position the selected network more towards the center
      scrollViewRef.current?.scrollTo({
        x: selectedIndex * PILL_WIDTH - PILL_WIDTH,
        animated: false,
      });
    }
    hasScrolledRef.current = true;
  };

  const handleAllPress = () => {
    onChainSelect(undefined);
  };

  const handleChainPress = (chainId: CaipChainId) => {
    onChainSelect(chainId);
  };

  const renderChainPills = () =>
    chainRanking.map((chain: { chainId: CaipChainId; name: string }) => {
      const isSelected = selectedChainId === chain.chainId;

      return (
        <ButtonToggle
          key={chain.chainId}
          label={chain.name}
          isActive={isSelected}
          onPress={() => handleChainPress(chain.chainId)}
          size={ButtonSize.Sm}
        />
      );
    });

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw.style('flex-grow-0')}
      contentContainerStyle={tw.style('flex-row items-center gap-2')}
      onContentSizeChange={handleContentSizeChange}
    >
      {/* All CTA - First pill */}
      <ButtonToggle
        label={strings('bridge.all')}
        isActive={!selectedChainId}
        onPress={handleAllPress}
        size={ButtonSize.Sm}
      />
      {renderChainPills()}
    </ScrollView>
  );
};
