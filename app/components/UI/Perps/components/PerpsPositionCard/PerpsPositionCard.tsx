import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type {
  PerpsNavigationParamList,
  Position,
  PriceUpdate,
} from '../../controllers/types';
import {
  formatPnl,
  formatPrice,
  formatPositionSize,
} from '../../utils/formatUtils';
import styleSheet from './PerpsPositionCard.styles';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import RemoteImage from '../../../../Base/RemoteImage';
import {
  usePerpsMarkets,
  usePerpsTPSLUpdate,
  usePerpsClosePosition,
} from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import PerpsTPSLBottomSheet from '../PerpsTPSLBottomSheet';
import PerpsClosePositionBottomSheet from '../PerpsClosePositionBottomSheet';

interface PerpsPositionCardProps {
  position: Position;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
  onPositionUpdate?: () => Promise<void>;
  priceData?: PriceUpdate | null; // Current market price data
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  expanded = true, // Default to expanded for backward compatibility
  showIcon = false, // Default to not showing icon
  rightAccessory,
  onPositionUpdate,
  priceData: externalPriceData,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { assetUrl } = usePerpsAssetMetadata(position.coin);

  // Subscribe to live prices at the leaf level to avoid re-rendering parent components
  // Only subscribe when expanded (detailed view) to optimize performance
  const livePrices = usePerpsLivePrices({
    symbols: expanded ? [position.coin] : [],
    throttleMs: 1000, // Update every second
  });

  // Use external price data if provided, otherwise use live prices
  const priceData = externalPriceData || livePrices[position.coin];

  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const [isClosePositionVisible, setIsClosePositionVisible] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );

  const { handleUpdateTPSL, isUpdating } = usePerpsTPSLUpdate({
    onSuccess: () => {
      // Positions update automatically via WebSocket
      // Call parent's position update callback if provided
      if (onPositionUpdate) {
        onPositionUpdate();
      }
    },
  });

  const { handleClosePosition, isClosing } = usePerpsClosePosition({
    onSuccess: () => {
      // Positions update automatically via WebSocket
      // Call parent's position update callback if provided
      if (onPositionUpdate) {
        onPositionUpdate();
      }
      setIsClosePositionVisible(false);
      setSelectedPosition(null);
    },
  });

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const { markets, error, isLoading } = usePerpsMarkets();

  const marketData = useMemo(
    () => markets.find((market) => market.symbol === position.coin),
    [markets, position.coin],
  );

  const handleCardPress = async () => {
    if (isLoading || error) {
      DevLogger.log(
        'Failed to redirect to market details. Error fetching market data: ',
        error,
      );
      return;
    }

    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: marketData,
      },
    });
  };

  const handleClosePress = () => {
    DevLogger.log('PerpsPositionCard: Opening close position bottom sheet');
    setSelectedPosition(position);
    setIsClosePositionVisible(true);
  };

  const pnlNum = parseFloat(position.unrealizedPnl);

  // ROE is always stored as a decimal (e.g., 0.171 for 17.1%)
  // Convert to percentage for display
  const roeValue = parseFloat(position.returnOnEquity || '0');
  const roe = isNaN(roeValue) ? 0 : roeValue * 100;

  const handleEditTPSL = () => {
    setSelectedPosition(position);
    setIsTPSLVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        style={expanded ? styles.expandedContainer : styles.collapsedContainer}
        // There's not functional reason for the card to be clickable when expanded
        onPress={expanded ? undefined : handleCardPress}
        testID="PerpsPositionCard"
        activeOpacity={expanded ? 1 : 0.2}
      >
        {/* Header - Always shown */}
        <View style={[styles.header, expanded && styles.headerExpanded]}>
          {/* Icon Section - Conditionally shown (only in collapsed mode) */}
          {showIcon && !expanded && (
            <View style={styles.perpIcon}>
              {assetUrl ? (
                <RemoteImage
                  source={{ uri: assetUrl }}
                  style={styles.tokenIcon}
                />
              ) : (
                <Icon name={IconName.Coin} size={IconSize.Lg} />
              )}
            </View>
          )}

          <View style={styles.headerLeft}>
            <View style={styles.headerRow}>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {position.coin} {position.leverage.value}x{' '}
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {direction}
                </Text>
              </Text>
            </View>
            <View style={styles.headerRow}>
              <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
                {formatPositionSize(absoluteSize.toString())} {position.coin}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {formatPrice(position.positionValue, {
                  minimumDecimals: 2,
                  maximumDecimals: 2,
                })}
              </Text>
            </View>
            <View style={styles.headerRow}>
              <Text
                variant={TextVariant.BodySM}
                color={pnlNum >= 0 ? TextColor.Success : TextColor.Error}
              >
                {formatPnl(pnlNum)} ({roe >= 0 ? '+' : ''}
                {roe.toFixed(1)}%)
              </Text>
            </View>
          </View>

          {/* Right Accessory - Conditionally shown */}
          {rightAccessory && (
            <View style={styles.rightAccessory}>{rightAccessory}</View>
          )}
        </View>

        {/* Body - Only shown when expanded */}
        {expanded && (
          <View style={styles.body}>
            <View style={styles.bodyRow}>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.entry_price')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {formatPrice(position.entryPrice, {
                    minimumDecimals: 2,
                    maximumDecimals: 2,
                  })}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.market_price')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {priceData?.price
                    ? formatPrice(priceData.price, {
                        minimumDecimals: 2,
                        maximumDecimals: 2,
                      })
                    : PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.liquidation_price')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {position.liquidationPrice
                    ? formatPrice(position.liquidationPrice, {
                        minimumDecimals: 2,
                        maximumDecimals: 2,
                      })
                    : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={[styles.bodyRow, styles.bodyRowLast]}>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.take_profit')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {position.takeProfitPrice
                    ? formatPrice(position.takeProfitPrice, {
                        minimumDecimals: 2,
                        maximumDecimals: 2,
                      })
                    : strings('perps.position.card.not_set')}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.stop_loss')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {position.stopLossPrice
                    ? formatPrice(position.stopLossPrice, {
                        minimumDecimals: 2,
                        maximumDecimals: 2,
                      })
                    : strings('perps.position.card.not_set')}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.margin')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {formatPrice(position.marginUsed, {
                    minimumDecimals: 2,
                    maximumDecimals: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer - Only shown when expanded */}
        {expanded && (
          <View style={styles.footer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              label={strings('perps.position.card.edit_tpsl')}
              onPress={handleEditTPSL}
              style={styles.footerButton}
              testID={PerpsPositionCardSelectorsIDs.EDIT_BUTTON}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              label={strings('perps.position.card.close_position')}
              onPress={handleClosePress}
              style={styles.footerButton}
              testID={PerpsPositionCardSelectorsIDs.CLOSE_BUTTON}
            />
          </View>
        )}
      </TouchableOpacity>
      {/* TP/SL Bottom Sheet - Wrapped in Modal to render from root */}
      {isTPSLVisible && selectedPosition && (
        <Modal visible transparent animationType="fade">
          <PerpsTPSLBottomSheet
            isVisible
            onClose={() => {
              setIsTPSLVisible(false);
              setSelectedPosition(null);
            }}
            onConfirm={async (takeProfitPrice, stopLossPrice) => {
              await handleUpdateTPSL(
                selectedPosition,
                takeProfitPrice,
                stopLossPrice,
              );
              setIsTPSLVisible(false);
              setSelectedPosition(null);
            }}
            asset={selectedPosition.coin}
            position={selectedPosition}
            initialTakeProfitPrice={selectedPosition.takeProfitPrice}
            initialStopLossPrice={selectedPosition.stopLossPrice}
            isUpdating={isUpdating}
          />
        </Modal>
      )}

      {/* Close Position Bottom Sheet - Wrapped in Modal to render from root */}
      {isClosePositionVisible && selectedPosition && (
        <Modal visible transparent animationType="fade">
          <PerpsClosePositionBottomSheet
            isVisible
            onClose={() => {
              setIsClosePositionVisible(false);
              setSelectedPosition(null);
            }}
            onConfirm={async (size, orderType, limitPrice) => {
              await handleClosePosition(
                selectedPosition,
                size,
                orderType,
                limitPrice,
              );
            }}
            position={selectedPosition}
            isClosing={isClosing}
          />
        </Modal>
      )}
    </>
  );
};

export default PerpsPositionCard;
