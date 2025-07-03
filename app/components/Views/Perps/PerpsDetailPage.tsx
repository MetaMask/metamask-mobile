import React from 'react';
import { View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import ScreenView from '../../Base/ScreenView';
import { Theme } from '../../../util/theme/models';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';

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

interface PerpsDetailPageProps {}

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
    assetHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 24,
    },
    assetIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background.alternative,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 16,
    },
    assetText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text.default,
    },
    assetInfo: {
      flex: 1,
    },
    tokenPair: {
      marginBottom: 4,
    },
    leverage: {
      marginBottom: 8,
    },
    currentPrice: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    priceChange: {
      fontSize: 14,
    },
    priceChangePositive: {
      color: colors.success.default,
    },
    priceChangeNegative: {
      color: colors.error.default,
    },
    detailsSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    detailGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
    },
    detailItem: {
      width: '48%' as const,
      marginBottom: 20,
      padding: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
    },
    detailLabel: {
      marginBottom: 8,
    },
    detailValue: {
      fontWeight: '600' as const,
      fontSize: 16,
    },
    buttonContainer: {
      marginTop: 'auto' as const,
    },
    button: {
      marginBottom: 16,
    },
  };
};

const PerpsDetailPage: React.FC<PerpsDetailPageProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const route = useRoute();

  // Get the position data from route params
  const position = (route.params as { position: PositionData })?.position;

  if (!position) {
    Logger.log('PerpsDetailPage: No position data provided');
    return (
      <ScreenView>
        <View style={styles.content}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Error: No position data
          </Text>
        </View>
      </ScreenView>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const isPositiveChange = position.priceChangePercent24h >= 0;

  const detailData = [
    { label: 'Position Size', value: formatCurrency(position.positionSize) },
    { label: 'Entry Price', value: formatCurrency(position.entryPrice) },
    {
      label: 'Liquidation Price',
      value: formatCurrency(position.liquidationPrice),
    },
    { label: 'Funding', value: formatCurrency(position.funding) },
    { label: 'Margin', value: formatCurrency(position.margin) },
    { label: 'TP/SL', value: formatCurrency(position.takeProfitStopLoss) },
  ];

  const handleBackToPositions = () => {
    navigation.navigate(Routes.PERPS.POSITIONS_VIEW as never);
  };

  const handleClosePosition = () => {
    Logger.log('PerpsDetailPage: Close position for', position.assetSymbol);
    // TODO: Implement close position logic
  };

  const handleEditPosition = () => {
    Logger.log('PerpsDetailPage: Edit position for', position.assetSymbol);
    // TODO: Implement edit position logic
  };

  return (
    <ScreenView>
      <View style={styles.content}>
        {/* Asset Header */}
        <View style={styles.assetHeader}>
          <View style={styles.assetIcon}>
            <Text style={styles.assetText}>{position.assetSymbol}</Text>
          </View>
          <View style={styles.assetInfo}>
            <Text
              variant={TextVariant.HeadingMD}
              color={TextColor.Default}
              style={styles.tokenPair}
            >
              {position.tokenPair}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.leverage}
            >
              {position.leverage} leverage
            </Text>
            <Text
              variant={TextVariant.HeadingLG}
              color={TextColor.Default}
              style={styles.currentPrice}
            >
              {formatCurrency(position.currentPrice)}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              style={[
                styles.priceChange,
                isPositiveChange
                  ? styles.priceChangePositive
                  : styles.priceChangeNegative,
              ]}
            >
              {isPositiveChange ? '+' : ''}
              {position.priceChangePercent24h.toFixed(2)}% (24h)
            </Text>
          </View>
        </View>

        {/* Position Details */}
        <View style={styles.detailsSection}>
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.sectionTitle}
          >
            Position Details
          </Text>
          <View style={styles.detailGrid}>
            {detailData.map((item, index) => (
              <View key={index} style={styles.detailItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Muted}
                  style={styles.detailLabel}
                >
                  {item.label}
                </Text>
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={TextColor.Default}
                  style={styles.detailValue}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Edit Position"
            onPress={handleEditPosition}
            style={styles.button}
          />
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Close Position"
            onPress={handleClosePosition}
            style={styles.button}
          />
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Back to Positions"
            onPress={handleBackToPositions}
          />
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsDetailPage;
