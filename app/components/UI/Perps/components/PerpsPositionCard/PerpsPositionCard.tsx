import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsPositionCardSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { TP_SL_CONFIG } from '../../constants/perpsConfig';
import type {
  PerpsNavigationParamList,
  Position,
} from '../../controllers/types';
import { usePerpsMarkets, usePerpsTPSLUpdate } from '../../hooks';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import {
  formatPerpsFiat,
  formatPnl,
  formatPositionSize,
  formatPrice,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_POSITION_VIEW,
} from '../../utils/formatUtils';
import { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import PerpsTPSLBottomSheet from '../PerpsTPSLBottomSheet';
import PerpsTokenLogo from '../PerpsTokenLogo';
import styleSheet from './PerpsPositionCard.styles';

interface PerpsPositionCardProps {
  position: Position;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
  onPositionUpdate?: () => Promise<void>;
  onTooltipPress?: (contentKey: PerpsTooltipContentKey) => void;
  onTpslCountPress?: () => void;
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  expanded = true, // Default to expanded for backward compatibility
  showIcon = false, // Default to not showing icon
  rightAccessory,
  onPositionUpdate,
  onTooltipPress,
  onTpslCountPress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const [isTPSLCountWarningVisible, setIsTPSLCountWarningVisible] =
    useState(false);

  const isEligible = useSelector(selectPerpsEligibility);

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
        initialTab: 'position',
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

    if (!TP_SL_CONFIG.USE_POSITION_BOUND_TPSL) {
      if (
        (position.takeProfitCount > 0 || position.stopLossCount > 0) &&
        (!position.takeProfitPrice || !position.stopLossPrice)
      ) {
        setIsTPSLCountWarningVisible(true);
        return;
      }
    }

    DevLogger.log('PerpsPositionCard: Editing TPSL', { position });
    setSelectedPosition(position);
    setIsTPSLVisible(true);
  };

  const handleTpslCountPress = async () => {
    if (isLoading || error) {
      DevLogger.log(
        'Failed to redirect to orders tab. Error fetching market data: ',
        error,
      );
      return;
    }

    if (!marketData) {
      DevLogger.log('No market data available for navigation');
      return;
    }

    if (onTpslCountPress) {
      onTpslCountPress();
    }
  };

  // Funding cost (cumulative since open) formatting logic
  const fundingSinceOpenRaw = position.cumulativeFunding?.sinceOpen ?? '0';
  const fundingSinceOpen = parseFloat(fundingSinceOpenRaw);
  const isNearZeroFunding = Math.abs(fundingSinceOpen) < 0.005; // Threshold: |value| < $0.005 -> display $0.00
  // Keep original color logic: exact zero = neutral, positive = cost (Error), negative = payment (Success)
  const fundingColor = isNearZeroFunding
    ? TextColor.Default
    : fundingSinceOpen === 0
    ? TextColor.Default
    : fundingSinceOpen > 0
    ? TextColor.Error
    : TextColor.Success;
  const fundingDisplay = isNearZeroFunding
    ? '$0.00'
    : `${fundingSinceOpen >= 0 ? '-' : '+'}${formatPerpsFiat(
        Math.abs(fundingSinceOpen),
        {
          ranges: PRICE_RANGES_MINIMAL_VIEW,
        },
      )}`;

  const positionTakeProfitCount = position.takeProfitCount || 0;
  const positionStopLossCount = position.stopLossCount || 0;

  const renderStopLossText = () => {
    if (TP_SL_CONFIG.USE_POSITION_BOUND_TPSL) {
      return (
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {positionStopLossCount > 1 ? (
            <TouchableOpacity onPress={handleTpslCountPress}>
              <Text style={styles.tpslCountPress}>
                {strings('perps.position.card.tpsl_count_multiple', {
                  count: position.stopLossCount,
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
          {positionStopLossCount <= 1
            ? position.stopLossPrice
              ? formatPerpsFiat(position.stopLossPrice, {
                  ranges: PRICE_RANGES_POSITION_VIEW,
                })
              : strings('perps.position.card.not_set')
            : null}
        </Text>
      );
    }

    return (
      <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
        {!position.stopLossPrice ? (
          <TouchableOpacity onPress={handleTpslCountPress}>
            <Text style={styles.tpslCountPress}>
              {strings('perps.position.card.tpsl_count_multiple', {
                count: position.stopLossCount,
              })}
            </Text>
          </TouchableOpacity>
        ) : position.stopLossPrice ? (
          formatPerpsFiat(position.stopLossPrice, {
            ranges: PRICE_RANGES_POSITION_VIEW,
          })
        ) : (
          strings('perps.position.card.not_set')
        )}
      </Text>
    );
  };

  const renderTakeProfitText = () => {
    if (TP_SL_CONFIG.USE_POSITION_BOUND_TPSL) {
      return (
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {positionTakeProfitCount > 1 ? (
            <TouchableOpacity onPress={handleTpslCountPress}>
              <Text style={styles.tpslCountPress}>
                {strings('perps.position.card.tpsl_count_multiple', {
                  count: position.takeProfitCount,
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
          {positionTakeProfitCount <= 1
            ? position.takeProfitPrice
              ? formatPerpsFiat(position.takeProfitPrice, {
                  ranges: PRICE_RANGES_POSITION_VIEW,
                })
              : strings('perps.position.card.not_set')
            : null}
        </Text>
      );
    }

    return (
      <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
        {!position.takeProfitPrice ? (
          <TouchableOpacity onPress={handleTpslCountPress}>
            <Text style={styles.tpslCountPress}>
              {strings('perps.position.card.tpsl_count_multiple', {
                count: position.takeProfitCount,
              })}
            </Text>
          </TouchableOpacity>
        ) : position.takeProfitPrice ? (
          formatPerpsFiat(position.takeProfitPrice, {
            ranges: PRICE_RANGES_POSITION_VIEW,
          })
        ) : (
          strings('perps.position.card.not_set')
        )}
      </Text>
    );
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
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {position.coin} {position.leverage.value}x{' '}
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {direction}
                </Text>
              </Text>
            </View>
            <View style={styles.headerRow}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
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
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.entry_price')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {formatPerpsFiat(position.entryPrice, {
                    ranges: PRICE_RANGES_POSITION_VIEW,
                  })}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.liquidation_price')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {position.liquidationPrice
                    ? formatPerpsFiat(position.liquidationPrice, {
                        ranges: PRICE_RANGES_POSITION_VIEW,
                      })
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.margin')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {formatPerpsFiat(position.marginUsed, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })}
                </Text>
              </View>
            </View>

            <View style={[styles.bodyRow, styles.bodyRowLast]}>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.take_profit')}
                </Text>
                <>{renderTakeProfitText()}</>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.stop_loss')}
                </Text>
                <>{renderStopLossText()}</>
              </View>
              <View style={styles.bodyItem}>
                <View style={styles.fundingCostLabelFlex}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                    style={styles.fundingCostLabelRightMargin}
                  >
                    {strings('perps.position.card.funding_cost')}
                  </Text>
                  {onTooltipPress && (
                    <TouchableOpacity
                      onPress={() => onTooltipPress('funding_rate')}
                    >
                      <Icon
                        name={IconName.Info}
                        size={IconSize.Sm}
                        color={IconColor.Muted}
                        testID={
                          PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON
                        }
                      />
                    </TouchableOpacity>
                  )}
                </View>
                <Text variant={TextVariant.BodyMD} color={fundingColor}>
                  {fundingDisplay}
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
              label={
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {strings('perps.position.card.close_position')}
                </Text>
              }
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
                selectedPosition.coin,
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
      {isTPSLCountWarningVisible && (
        <Modal visible transparent animationType="fade">
          <PerpsBottomSheetTooltip
            isVisible
            onClose={() => setIsTPSLCountWarningVisible(false)}
            contentKey={'tpsl_count_warning'}
            buttonConfig={[
              {
                label: strings(
                  'perps.tooltips.tpsl_count_warning.got_it_button',
                ),
                onPress: () => setIsTPSLCountWarningVisible(false),
                variant: ButtonVariants.Secondary,
                size: ButtonSize.Lg,
                testID:
                  PerpsPositionCardSelectorsIDs.TPSL_COUNT_WARNING_TOOLTIP_GOT_IT_BUTTON,
              },
              {
                label: strings(
                  'perps.tooltips.tpsl_count_warning.view_orders_button',
                ),
                onPress: () => handleTpslCountPress(),
                variant: ButtonVariants.Primary,
                size: ButtonSize.Lg,
                testID:
                  PerpsPositionCardSelectorsIDs.TPSL_COUNT_WARNING_TOOLTIP_VIEW_ORDERS_BUTTON,
              },
            ]}
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
