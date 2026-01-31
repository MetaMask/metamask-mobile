import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import {
  LeaderboardChainFilter,
  LEADERBOARD_CHAIN_FILTERS,
} from '../../types';

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  pillUnselected: {
    borderWidth: 1,
  },
});

interface ChainFilterProps {
  /** Currently selected chain filter */
  selectedChain: LeaderboardChainFilter;
  /** Callback when a chain is selected */
  onChainSelect: (chain: LeaderboardChainFilter) => void;
  /** Test ID prefix */
  testID?: string;
}

/**
 * Horizontal scrollable chain filter pills for the leaderboard
 */
const ChainFilter: React.FC<ChainFilterProps> = ({
  selectedChain,
  onChainSelect,
  testID = 'chain-filter',
}) => {
  const tw = useTailwind();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[tw.style('bg-default'), styles.scrollView]}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
    >
      {LEADERBOARD_CHAIN_FILTERS.map((filter) => {
        const isSelected = selectedChain === filter.id;

        return (
          <TouchableOpacity
            key={filter.id}
            onPress={() => onChainSelect(filter.id)}
            style={[
              styles.pill,
              tw.style(isSelected ? 'bg-icon-default' : 'bg-default'),
              !isSelected && styles.pillUnselected,
              !isSelected && tw.style('border-muted'),
            ]}
            activeOpacity={0.7}
            testID={`${testID}-${filter.id}`}
          >
            <Text
              variant={TextVariant.BodySm}
              twClassName={isSelected ? 'text-background-default' : 'text-default'}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default ChainFilter;
