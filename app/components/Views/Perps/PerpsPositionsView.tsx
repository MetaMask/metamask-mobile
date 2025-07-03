import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import ScreenView from '../../Base/ScreenView';
import Logger from '../../../util/Logger';
import PerpsPositionListItem from './PerpsPositionListItem';
import PerpsPositionsHeader from './PerpsPositionsHeader';
import { Theme } from '../../../util/theme/models';

// Mock data structure for positions
interface PositionData {
  id: string;
  assetSymbol: string;
  tokenPair: string;
  leverage: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  positionSize: number;
  entryPrice: number;
  liquidationPrice: number;
  funding: number;
  margin: number;
  takeProfitStopLoss: number;
}

interface PerpsPositionsViewProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    headerContainer: {
      alignItems: 'center' as const,
      marginBottom: 32,
    },

    positionsSection: {
      flex: 1,
    },
    sectionTitle: {
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingVertical: 40,
    },
    emptyStateText: {
      marginBottom: 16,
    },
    buttonContainer: {
      marginBottom: 32,
    },
    button: {
      marginBottom: 16,
    },
    positionItem: {
      marginBottom: 12,
      padding: 16,
      backgroundColor: colors.background.default,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
  };
};

// Mock position data
const mockPositions: PositionData[] = [
  {
    id: '1',
    assetSymbol: 'BTC',
    tokenPair: 'BTC-USDC',
    leverage: '5x',
    currentPrice: 43250.75,
    priceChange24h: 1250.5,
    priceChangePercent24h: 2.98,
    positionSize: 25000,
    entryPrice: 42000.25,
    liquidationPrice: 38500.0,
    funding: -125.5,
    margin: 5000.0,
    takeProfitStopLoss: 45000.0,
  },
  {
    id: '2',
    assetSymbol: 'ETH',
    tokenPair: 'ETH-USDC',
    leverage: '3x',
    currentPrice: 2580.45,
    priceChange24h: -85.3,
    priceChangePercent24h: -3.2,
    positionSize: 15000,
    entryPrice: 2650.8,
    liquidationPrice: 2200.0,
    funding: 45.25,
    margin: 5000.0,
    takeProfitStopLoss: 2800.0,
  },
  {
    id: '3',
    assetSymbol: 'SOL',
    tokenPair: 'SOL-USDC',
    leverage: '10x',
    currentPrice: 98.75,
    priceChange24h: 5.25,
    priceChangePercent24h: 5.61,
    positionSize: 8000,
    entryPrice: 95.5,
    liquidationPrice: 88.0,
    funding: 12.8,
    margin: 800.0,
    takeProfitStopLoss: 105.0,
  },
];

const PerpsPositionsView: React.FC<PerpsPositionsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const [isLoading, setIsLoading] = useState(false);
  const [positions] = useState<PositionData[]>(mockPositions);

  // Calculate total portfolio value and 24h change
  const totalPortfolioValue = positions.reduce(
    (total, position) => total + position.positionSize,
    0,
  );
  const total24hChange = positions.reduce(
    (total, position) => total + position.priceChange24h,
    0,
  );
  const total24hChangePercent =
    totalPortfolioValue > 0 ? (total24hChange / totalPortfolioValue) * 100 : 0;

  const handleRefresh = async () => {
    setIsLoading(true);
    Logger.log('PerpsPositionsView: Refreshing positions');

    // Simulate refresh operation
    setTimeout(() => {
      setIsLoading(false);
      Logger.log('PerpsPositionsView: Positions refreshed');
    }, 1000);
  };

  const renderPositionItem = ({ item }: { item: PositionData }) => (
    <PerpsPositionListItem position={item} />
  );

  return (
    <ScreenView>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Perps Positions
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            Monitor your trading positions
          </Text>
        </View>

        {/* Header Section */}
        <PerpsPositionsHeader
          totalPortfolioValue={totalPortfolioValue}
          total24hChange={total24hChange}
          total24hChangePercent={total24hChangePercent}
        />

        {/* Positions Section */}
        <View style={styles.positionsSection}>
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.sectionTitle}
          >
            Open Positions ({positions.length})
          </Text>

          {positions.length > 0 ? (
            <FlatList
              data={positions}
              keyExtractor={(item) => item.id}
              renderItem={renderPositionItem}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Muted}
                style={styles.emptyStateText}
              >
                No open positions
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
                Start trading to see your positions here
              </Text>
            </View>
          )}
        </View>

        {/* Refresh Button */}
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Refresh Positions"
            onPress={handleRefresh}
            loading={isLoading}
            style={styles.button}
          />
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsPositionsView;
