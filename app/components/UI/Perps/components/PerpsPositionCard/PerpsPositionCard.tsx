import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type {
  PerpsNavigationParamList,
  Position,
} from '../../controllers/types';
import { usePerpsMarkets, usePerpsTPSLUpdate } from '../../hooks';
import {
  formatPnl,
  formatPositionSize,
  formatPrice,
} from '../../utils/formatUtils';
import PerpsTPSLBottomSheet from '../PerpsTPSLBottomSheet';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { usePerpsEligibility } from '../../hooks/usePerpsEligibility';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import styleSheet from './PerpsPositionCard.styles';

interface PerpsPositionCardProps {
  position: Position;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
  onPositionUpdate?: () => Promise<void>;
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  expanded = true, // Default to expanded for backward compatibility
  showIcon = false, // Default to not showing icon
  rightAccessory,
  onPositionUpdate,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const { isEligible } = usePerpsEligibility();

  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
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
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    DevLogger.log('PerpsPositionCard: Navigating to close position screen');
    navigation.navigate(Routes.PERPS.CLOSE_POSITION, { position });
  };

  const pnlNum = parseFloat(position.unrealizedPnl);

  // ROE is always stored as a decimal (e.g., 0.171 for 17.1%)
  // Convert to percentage for display
  const roeValue = parseFloat(position.returnOnEquity || '0');
  const roe = isNaN(roeValue) ? 0 : roeValue * 100;

  const handleEditTPSL = () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

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
              <PerpsTokenLogo symbol={position.coin} size={40} />
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
                  {strings('perps.position.card.funding_cost')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {formatPrice(position.cumulativeFunding.sinceOpen, {
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
      {isEligibilityModalVisible && (
        <Modal visible transparent animationType="fade">
          <PerpsBottomSheetTooltip
            isVisible
            onClose={() => setIsEligibilityModalVisible(false)}
            contentKey={'geo_block'}
          />
        </Modal>
      )}
    </>
  );
};

export default PerpsPositionCard;
