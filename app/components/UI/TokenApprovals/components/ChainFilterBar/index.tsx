import React, { useCallback } from 'react';
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

  const isSelected = useCallback(
    (chainId: string) => selectedChains.includes(chainId),
    [selectedChains],
  );

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
        {chains.map((chain) => {
          const selected = isSelected(chain.chainId);
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
              accessibilityLabel={`${chain.displayName} ${strings('token_approvals.filter_all')} ${chain.count}`}
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
