import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import React, { useMemo } from 'react';
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
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import { usePerpsLivePositions } from '../../hooks';
import { usePerpsLiveAccount } from '../../hooks/stream';
import {
  formatPnl,
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { getPositionDirection } from '../../utils/positionCalculations';
import { calculateTotalPnL } from '../../utils/pnlCalculations';
import { createStyles } from './PerpsPositionsView.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PerpsPositionsViewSelectorsIDs } from '../../Perps.testIds';

const PerpsPositionsView: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { account } = usePerpsLiveAccount();

  // Get real-time positions via WebSocket
  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000, // Update every second
    useLivePnl: true, // Enable live PnL calculations for position display
  });

  const error = null;

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
          const directionSegment = getPositionDirection(position.size);
          return (
            <View
              key={`${position.symbol}-${index}`}
              testID={`${PerpsPositionsViewSelectorsIDs.POSITION_ITEM}-${position.symbol}-${position.leverage.value}x-${directionSegment}-${index}`}
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
          testID={PerpsPositionsViewSelectorsIDs.BACK_BUTTON}
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
              {account?.totalBalance !== undefined &&
              account?.totalBalance !== null
                ? formatPerpsFiat(account.totalBalance, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })
                : PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.available_balance')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {account?.availableBalance !== undefined &&
              account?.availableBalance !== null
                ? formatPerpsFiat(account.availableBalance, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })
                : PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.margin_used')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {account?.marginUsed !== undefined && account?.marginUsed !== null
                ? formatPerpsFiat(account.marginUsed, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })
                : PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
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
    </SafeAreaView>
  );
};

export default PerpsPositionsView;
