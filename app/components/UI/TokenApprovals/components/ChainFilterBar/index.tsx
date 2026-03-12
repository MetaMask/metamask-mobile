import React, { useCallback, useMemo } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { useTheme } from '../../../../../util/theme';
import { getNetworkImageSource } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
});

interface ChainInfo {
  chainId: string;
  displayName: string;
  count: number;
}

interface ChainFilterBarProps {
  chains: ChainInfo[];
  selectedChains: string[];
  onChainToggle: (chainId: string) => void;
}

const ChainFilterBar: React.FC<ChainFilterBarProps> = ({
  chains,
  selectedChains,
  onChainToggle,
}) => {
  const { colors } = useTheme();

  const totalCount = useMemo(
    () => chains.reduce((sum, c) => sum + c.count, 0),
    [chains],
  );

  const isAllSelected = useMemo(
    () =>
      selectedChains.length === 0 || selectedChains.length === chains.length,
    [selectedChains, chains],
  );

  const isChainSelected = useCallback(
    (chainId: string) => !isAllSelected && selectedChains.includes(chainId),
    [selectedChains, isAllSelected],
  );

  const handleAllPress = useCallback(() => {
    // Clear all filters to show all chains
    if (!isAllSelected) {
      for (const chain of chains) {
        if (selectedChains.includes(chain.chainId)) {
          onChainToggle(chain.chainId);
        }
      }
    }
  }, [isAllSelected, chains, selectedChains, onChainToggle]);

  if (chains.length <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: isAllSelected
                ? colors.primary.default
                : colors.background.alternative,
            },
          ]}
          onPress={handleAllPress}
          accessibilityRole="button"
          accessibilityState={{ selected: isAllSelected }}
          accessibilityLabel={`${strings('token_approvals.filter_all')} ${totalCount}`}
        >
          <Text
            variant={TextVariant.BodySM}
            color={isAllSelected ? TextColor.Inverse : TextColor.Default}
          >
            {strings('token_approvals.filter_all')} ({totalCount})
          </Text>
        </TouchableOpacity>

        {/* Chain chips */}
        {chains.map((chain) => {
          const selected = isChainSelected(chain.chainId);
          const networkImage = getNetworkImageSource({
            chainId: chain.chainId,
          });
          return (
            <TouchableOpacity
              key={chain.chainId}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? colors.primary.default
                    : colors.background.alternative,
                },
              ]}
              onPress={() => onChainToggle(chain.chainId)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${chain.displayName} ${chain.count}`}
            >
              {networkImage && (
                <AvatarNetwork
                  size={AvatarSize.Xs}
                  imageSource={networkImage}
                  name={chain.displayName}
                />
              )}
              <Text
                variant={TextVariant.BodySM}
                color={selected ? TextColor.Inverse : TextColor.Default}
              >
                {chain.displayName} ({chain.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default ChainFilterBar;
