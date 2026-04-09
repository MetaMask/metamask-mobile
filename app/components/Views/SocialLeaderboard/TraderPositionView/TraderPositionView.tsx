import React, { useCallback, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  AvatarBase,
  AvatarBaseSize,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../locales/i18n';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import QuickBuyBottomSheet from './components/QuickBuyBottomSheet';
import { chainNameToId } from '../utils/chainMapping';
import { getAssetImageUrl } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------

interface TraderPositionRouteParams {
  TraderPositionView: {
    traderId: string;
    traderName: string;
    tokenSymbol: string;
    position?: Position;
  };
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TIME_PERIODS = ['1H', '1D', '1W', '1M', 'All'] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

const MOCK_TOKEN = {
  symbol: 'PUNCH',
  priceChange: '+$0.0000981 (7.2%)',
  priceChangePeriod: '1H',
  marketCap: '$11.7M',
};

const MOCK_POSITION = {
  value: '$14,670',
  pnlValue: '+$790.65',
  pnlPercent: '+5.08%',
  isPositive: true,
};

interface MockTrade {
  id: string;
  direction: 'buy' | 'sell';
  traderName: string;
  timestamp: string;
  usdValue: string;
  percentage: string;
  isPositive: boolean;
}

const MOCK_TRADES: MockTrade[] = [
  {
    id: '1',
    direction: 'buy',
    traderName: 'dutchiono',
    timestamp: 'March 4 at 9:15am',
    usdValue: '$2.2K',
    percentage: '+5%',
    isPositive: true,
  },
  {
    id: '2',
    direction: 'sell',
    traderName: 'dutchiono',
    timestamp: 'March 4 at 8:02am',
    usdValue: '-$1.1K',
    percentage: '-79%',
    isPositive: false,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TimePeriodButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TimePeriodButton: React.FC<TimePeriodButtonProps> = ({
  label,
  isActive,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress}>
    <Box
      twClassName={`flex-1 items-center justify-center px-2 py-1 rounded ${
        isActive ? 'bg-muted' : ''
      }`}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </TouchableOpacity>
);

interface TradeRowProps {
  trade: MockTrade;
}

const TradeRow: React.FC<TradeRowProps> = ({ trade }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-4 py-3"
    testID={`trade-row-${trade.id}`}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={4}
      twClassName="flex-1 min-w-0 mr-3"
    >
      <AvatarBase
        size={AvatarBaseSize.Md}
        fallbackText={trade.traderName.charAt(0).toUpperCase()}
      />
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {trade.direction === 'buy'
            ? strings('social_leaderboard.trader_position.bought', {
                name: trade.traderName,
              })
            : strings('social_leaderboard.trader_position.sold', {
                name: trade.traderName,
              })}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {trade.timestamp}
        </Text>
      </Box>
    </Box>

    <Box alignItems={BoxAlignItems.FlexEnd}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName={
          trade.isPositive ? 'text-success-default' : 'text-error-default'
        }
      >
        {trade.usdValue}
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {trade.percentage}
      </Text>
    </Box>
  </Box>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TraderPositionView = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<TraderPositionRouteParams, 'TraderPositionView'>>();
  const tw = useTailwind();

  const { traderName, tokenSymbol, position: positionParam } = route.params;

  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>('1D');
  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);

  const tokenImageUrl = useMemo(() => {
    if (!positionParam) return undefined;
    const chainId = chainNameToId(positionParam.chain);
    if (!chainId) return undefined;
    return getAssetImageUrl(positionParam.tokenAddress, chainId);
  }, [positionParam]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBuyPress = useCallback(() => {
    setIsQuickBuyVisible(true);
  }, []);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const symbol = tokenSymbol || MOCK_TOKEN.symbol;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderPositionViewSelectorsIDs.CONTAINER}
    >
      {/* Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <Box twClassName="w-10" />
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {traderName}
        </Text>
        <Box twClassName="w-10 items-end">
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={TraderPositionViewSelectorsIDs.CLOSE_BUTTON}
          />
        </Box>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
      >
        {/* Token Info Row */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 py-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={4}
            twClassName="flex-1 min-w-0 mr-3"
          >
            <AvatarToken
              name={symbol}
              src={tokenImageUrl ? { uri: tokenImageUrl } : undefined}
              size={AvatarTokenSize.Lg}
            />
            <Box twClassName="flex-1 min-w-0">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {symbol}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-success-default"
                numberOfLines={1}
              >
                {`${MOCK_TOKEN.priceChange} `}
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {MOCK_TOKEN.priceChangePeriod}
                </Text>
              </Text>
            </Box>
          </Box>

          <Box alignItems={BoxAlignItems.FlexEnd}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {MOCK_TOKEN.marketCap}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.trader_position.market_cap')}
            </Text>
          </Box>
        </Box>

        {/* Chart Placeholder */}
        <View style={tw.style('mx-4 my-3 h-48 bg-muted rounded-xl')} />

        {/* Timeline Selector */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 pb-3"
          gap={3}
        >
          {TIME_PERIODS.map((period) => (
            <TimePeriodButton
              key={period}
              label={period}
              isActive={activeTimePeriod === period}
              onPress={() => setActiveTimePeriod(period)}
            />
          ))}
        </Box>

        {/* Position Card */}
        <Box twClassName="mx-4 p-4 bg-muted rounded-2xl">
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.FlexStart}
          >
            <Box>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {MOCK_POSITION.value}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('social_leaderboard.trader_position.position')}
              </Text>
            </Box>
            <Box alignItems={BoxAlignItems.FlexEnd}>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                twClassName={
                  MOCK_POSITION.isPositive
                    ? 'text-success-default'
                    : 'text-error-default'
                }
              >
                {MOCK_POSITION.pnlValue}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {MOCK_POSITION.pnlPercent}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Trades Tab Header */}
        <Box twClassName="px-4 mt-5">
          <Box twClassName="self-start pb-2 border-b-2 border-white">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {strings('social_leaderboard.trader_position.trades')}
            </Text>
          </Box>
          <Box twClassName="h-px bg-muted -mt-0.5" />
        </Box>

        {/* Trade History */}
        {MOCK_TRADES.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </ScrollView>

      {/* Buy Button — pinned at bottom */}
      <Box twClassName="px-4 py-3">
        <Button
          variant={ButtonVariant.Secondary}
          isFullWidth
          onPress={handleBuyPress}
          testID={TraderPositionViewSelectorsIDs.BUY_BUTTON}
        >
          {strings('social_leaderboard.trader_position.buy')}
        </Button>
      </Box>

      <QuickBuyBottomSheet
        isVisible={isQuickBuyVisible}
        position={positionParam ?? null}
        onClose={handleQuickBuyClose}
      />
    </SafeAreaView>
  );
};

export default TraderPositionView;
