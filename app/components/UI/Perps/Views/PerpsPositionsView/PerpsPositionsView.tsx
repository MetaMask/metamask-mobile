import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import PerpsTPSLBottomSheet from '../../components/PerpsTPSLBottomSheet';
import type { Position } from '../../controllers/types';
import { usePerpsLivePositions, usePerpsTPSLUpdate } from '../../hooks';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { formatPnl, formatPrice } from '../../utils/formatUtils';
import { calculateTotalPnL } from '../../utils/pnlCalculations';
import { createStyles } from './PerpsPositionsView.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PerpsPositionsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const PerpsPositionsView: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { account } = usePerpsLiveAccount();

  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );
  const [isTPSLVisible, setIsTPSLVisible] = useState(false);

  // Get real-time positions via WebSocket
  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000, // Update every second
  });

  const error = null;

  const { handleUpdateTPSL, isUpdating } = usePerpsTPSLUpdate({
    onSuccess: () => {
      // Positions update automatically via WebSocket
      setIsTPSLVisible(false);
      setSelectedPosition(null);
    },
  });

  // Memoize position count text to avoid recalculating on every render
  const positionCountText = useMemo(() => {
    const positionCount = positions.length;
    return positionCount > 1
      ? strings('perps.position.list.position_count_plural', {
          count: positionCount,
        })
      : strings('perps.position.list.position_count', {
          count: positionCount,
        });
  }, [positions]);

  // Calculate total unrealized PnL using utility function
  const totalUnrealizedPnl = calculateTotalPnL({ positions });

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderContent = () => {
    if (isInitialLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings('perps.position.list.loading')}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Error}>
            {strings('perps.position.list.error_title')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            {error}
          </Text>
        </View>
      );
    }

    if (positions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {strings('perps.position.list.empty_title')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            {strings('perps.position.list.empty_description')}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={styles.positionsSection}
        testID={PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION}
      >
        <View style={styles.sectionHeader}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {strings('perps.position.list.open_positions')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            {positionCountText}
          </Text>
        </View>
        {positions.map((position, index) => {
          const sizeValue = parseFloat(position.size);
          const directionSegment = Number.isFinite(sizeValue)
            ? sizeValue > 0
              ? 'long'
              : sizeValue < 0
              ? 'short'
              : 'unknown'
            : 'unknown';
          return (
            <View
              key={`${position.coin}-${index}`}
              testID={`${PerpsPositionsViewSelectorsIDs.POSITION_ITEM}-${position.coin}-${position.leverage.value}x-${directionSegment}-${index}`}
            >
              <PerpsPositionCard position={position} />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Md}
          onPress={handleBackPress}
          testID="back-button"
        />
        <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
          {strings('perps.position.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.container}>
        {/* Account Summary */}
        <View style={styles.accountSummary}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('perps.position.account.summary_title')}
          </Text>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.total_balance')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {formatPrice(account?.totalBalance || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.available_balance')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {formatPrice(account?.availableBalance || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.margin_used')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {formatPrice(account?.marginUsed || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.total_unrealized_pnl')}
            </Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={
                totalUnrealizedPnl >= 0 ? TextColor.Success : TextColor.Error
              }
            >
              {formatPnl(totalUnrealizedPnl)}
            </Text>
          </View>
        </View>
        {renderContent()}
      </ScrollView>

      {/* TP/SL Bottom Sheet - Rendered outside ScrollView to fix layering issue */}
      {isTPSLVisible && selectedPosition && (
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
      )}
    </SafeAreaView>
  );
};

export default PerpsPositionsView;
