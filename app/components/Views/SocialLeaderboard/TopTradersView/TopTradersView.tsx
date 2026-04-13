import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import {
  TraderRow,
  TraderRowSkeleton,
} from '../../Homepage/Sections/TopTraders/components';
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import Routes from '../../../../constants/navigation/Routes';

const SKELETON_COUNT = 5;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `top-trader-skeleton-${i}`,
);

type ChainFilter = 'all' | 'base' | 'solana' | 'ethereum';

const CHAIN_FILTERS: { key: ChainFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'base', label: 'Base' },
  { key: 'solana', label: 'Solana' },
  { key: 'ethereum', label: 'Ethereum' },
];

interface ChainPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const ChainPill: React.FC<ChainPillProps> = ({
  label,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    testID={`chain-filter-${label.toLowerCase()}`}
  >
    <Box
      twClassName={`px-4 py-2 rounded-xl border ${
        isSelected ? 'bg-default border-white' : 'border-muted'
      }`}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isSelected ? TextColor.TextDefault : TextColor.TextMuted}
      >
        {label}
      </Text>
    </Box>
  </TouchableOpacity>
);

const TopTradersView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const [selectedChain, setSelectedChain] = useState<ChainFilter>('all');

  const { traders, isLoading, toggleFollow } = useTopTraders({ limit: 250 });

  const filteredTraders = useMemo(() => {
    const filtered =
      selectedChain === 'all'
        ? traders
        : traders.filter((t) => (t.pnlPerChain[selectedChain] ?? 0) !== 0);

    return filtered.slice(0, 50).map((t, i) => ({ ...t, rank: i + 1 }));
  }, [traders, selectedChain]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    // Search UI will be wired in a future ticket.
  }, []);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      navigation.navigate(
        Routes.SOCIAL_LEADERBOARD.PROFILE as never,
        {
          traderId,
          traderName,
        } as never,
      );
    },
    [navigation],
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TopTradersViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          testID={TopTradersViewSelectorsIDs.BACK_BUTTON}
        />
        <ButtonIcon
          iconName={IconName.Search}
          size={ButtonIconSize.Md}
          onPress={handleSearchPress}
          testID={TopTradersViewSelectorsIDs.SEARCH_BUTTON}
        />
      </Box>

      <Box twClassName="px-4 pt-2 pb-3">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
        >
          {strings('social_leaderboard.top_traders_view.title')}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="px-4 pb-3 justify-between"
      >
        {CHAIN_FILTERS.map(({ key, label }) => (
          <ChainPill
            key={key}
            label={label}
            isSelected={selectedChain === key}
            onPress={() => setSelectedChain(key)}
          />
        ))}
      </Box>

      {isLoading ? (
        SKELETON_KEYS.map((key) => <TraderRowSkeleton key={key} />)
      ) : (
        <FlatList
          data={filteredTraders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TraderRow
              trader={item}
              onFollowPress={toggleFollow}
              onTraderPress={handleTraderPress}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          testID="top-traders-view-list"
          initialNumToRender={15}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
};

export default TopTradersView;
