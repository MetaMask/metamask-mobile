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
  formatPercentage,
  formatPnl,
  formatPrice,
  formatPositionSize,
} from '../../utils/formatUtils';
import { calculatePnLPercentageFromUnrealized } from '../../utils/pnlCalculations';
import styleSheet from './PerpsPositionCard.styles';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import RemoteImage from '../../../../Base/RemoteImage';
import {
  usePerpsMarkets,
  usePerpsPositions,
  usePerpsTPSLUpdate,
} from '../../hooks';
import PerpsTPSLBottomSheet from '../PerpsTPSLBottomSheet';

interface PerpsPositionCardProps {
  position: Position;
  onClose?: (position: Position) => void;
  disabled?: boolean;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
  // TODO: POST_REBASE_CHECK: Is this still in use?
  isInPerpsNavContext?: boolean; // NEW: Indicates if this is used within the Perps navigation stack
  priceData?: PriceUpdate | null; // Current market price data
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  onClose,
  disabled = false,
  expanded = true, // Default to expanded for backward compatibility
  showIcon = false, // Default to not showing icon
  rightAccessory,
  // TODO: POST_REBASE_CHECK: Is this still in use?
  isInPerpsNavContext = true, // Default to true since most usage is within Perps stack
  priceData,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { assetUrl } = usePerpsAssetMetadata(position.coin);

  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );

  const { loadPositions } = usePerpsPositions({
    loadOnMount: true,
    refreshOnFocus: true,
  });

  const { handleUpdateTPSL, isUpdating } = usePerpsTPSLUpdate({
    onSuccess: () => {
      // Refresh positions to show updated data
      loadPositions({ isRefresh: true });
    },
  });

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const { markets, error, isLoading } = usePerpsMarkets();

  const marketData = useMemo(
    () => markets.find((market) => market.name === position.coin),
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
    // await triggerSelectionHaptic();
    if (onClose) {
      onClose(position);
      return;
    }

    // Navigate to position details with close action
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.POSITION_DETAILS,
      params: {
        position,
        action: 'close',
      },
    });
  };

  const pnlNum = parseFloat(position.unrealizedPnl);
  const pnlPercentage = calculatePnLPercentageFromUnrealized({
    unrealizedPnl: pnlNum,
    entryPrice: parseFloat(position.entryPrice),
    size: parseFloat(position.size),
  });
  const isPositive24h =
    position.cumulativeFunding.sinceChange &&
    parseFloat(position.cumulativeFunding.sinceChange) >= 0;

  const handleEditTPSL = () => {
    setSelectedPosition(position);
    setIsTPSLVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        style={expanded ? styles.expandedContainer : styles.collapsedContainer}
        onPress={handleCardPress}
        testID="PerpsPositionCard"
        disabled={disabled}
      >
        {/* Header - Always shown */}
        <View style={styles.header}>
          {/* Icon Section - Conditionally shown */}
          {showIcon && (
            <View style={styles.perpIcon}>
              {assetUrl ? (
                <RemoteImage
                  source={{ uri: assetUrl }}
                  style={styles.tokenIcon}
                />
              ) : (
                <Icon name={IconName.Coin} size={IconSize.Md} />
              )}
            </View>
          )}

          <View style={styles.headerLeft}>
            <View style={styles.headerRow}>
              <Text variant={TextVariant.BodySMBold} color={TextColor.Default}>
                {position.leverage.value}x{' '}
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={isLong ? TextColor.Success : TextColor.Error}
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
              <Text variant={TextVariant.BodySMBold} color={TextColor.Default}>
                {formatPrice(position.positionValue)}
              </Text>
            </View>
            <View style={styles.headerRow}>
              <Text
                variant={TextVariant.BodySMBold}
                color={isPositive24h ? TextColor.Success : TextColor.Error}
              >
                {formatPnl(pnlNum)} ({formatPercentage(pnlPercentage)})
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
                <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                  {strings('perps.position.card.entry_price')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {formatPrice(position.entryPrice)}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                  {strings('perps.position.card.market_price')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {formatPrice(
                    position.liquidationPrice || position.entryPrice,
                  )}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                  {strings('perps.position.card.liquidity_price')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {position.liquidationPrice
                    ? formatPrice(position.liquidationPrice)
                    : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.bodyRow}>
              <View style={styles.bodyItem}>
                <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                  {strings('perps.position.card.take_profit')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {position.takeProfitPrice
                    ? formatPrice(position.takeProfitPrice)
                    : strings('perps.position.card.not_set')}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                  {strings('perps.position.card.stop_loss')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {position.stopLossPrice
                    ? formatPrice(position.stopLossPrice)
                    : strings('perps.position.card.not_set')}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                  {strings('perps.position.card.margin')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {formatPrice(position.marginUsed)}
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
              disabled={disabled}
              style={styles.footerButton}
              testID={PerpsPositionCardSelectorsIDs.EDIT_BUTTON}
            />
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              label={strings('perps.position.card.close_position')}
              onPress={handleClosePress}
              disabled={disabled}
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
    </>
  );
};

export default PerpsPositionCard;
