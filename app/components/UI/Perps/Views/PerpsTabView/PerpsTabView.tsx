import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, RefreshControl, ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
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
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import { PerpsTabControlBar } from '../../components/PerpsTabControlBar';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import type { PerpsNavigationParamList } from '../../controllers/types';
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsEventTracking,
  usePerpsFirstTimeUser,
  usePerpsPositions,
  usePerpsTrading,
  usePerpsPerformance,
} from '../../hooks';
import styleSheet from './PerpsTabView.styles';

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { getAccountState, depositWithConfirmation } = usePerpsTrading();
  const { isConnected, isInitialized } = usePerpsConnection();
  const { track } = usePerpsEventTracking();
  const cachedAccountState = usePerpsAccount();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const hasTrackedHomescreen = useRef(false);
  const { startMeasure, endMeasure } = usePerpsPerformance();

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const {
    positions,
    isLoading: isPositionsLoading,
    isRefreshing,
    loadPositions,
  } = usePerpsPositions();
  const { isFirstTimeUser } = usePerpsFirstTimeUser();

  const isLoading = isPositionsLoading;
  const firstTimeUserIconSize = 48 as unknown as IconSize;

  // Start measuring position data load time on mount
  useEffect(() => {
    startMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB);
  }, [startMeasure]);

  // Automatically load account state on mount and when network changes
  useEffect(() => {
    // Only load account state if we're connected and initialized
    if (isConnected && isInitialized) {
      // Fire and forget - errors are already handled in getAccountState
      // and stored in the controller's state
      getAccountState();
    }
  }, [getAccountState, isConnected, isInitialized]);

  // Track homescreen tab viewed - only once when positions and account are loaded
  useEffect(() => {
    if (
      !hasTrackedHomescreen.current &&
      !isLoading &&
      positions &&
      cachedAccountState?.totalBalance !== undefined
    ) {
      // Track position data loaded performance
      endMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB);

      // Track homescreen tab viewed event with exact property names from requirements
      track(MetaMetricsEvents.PERPS_HOMESCREEN_TAB_VIEWED, {
        [PerpsEventProperties.OPEN_POSITION]: positions.map((p) => ({
          [PerpsEventProperties.ASSET]: p.coin,
          [PerpsEventProperties.LEVERAGE]: p.leverage.value,
          [PerpsEventProperties.DIRECTION]:
            parseFloat(p.size) > 0
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
        })),
        [PerpsEventProperties.PERP_ACCOUNT_BALANCE]: parseFloat(
          cachedAccountState.totalBalance,
        ),
      });

      hasTrackedHomescreen.current = true;
    }
  }, [
    isLoading,
    positions,
    cachedAccountState?.totalBalance,
    track,
    endMeasure,
  ]);

  const handleRefresh = useCallback(() => {
    loadPositions();
  }, [loadPositions]);

  const handleManageBalancePress = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const handleAddFunds = useCallback(() => {
    setIsBottomSheetVisible(false);

    // Navigate immediately to confirmations screen for instant UI response
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    });

    // Initialize deposit in the background without blocking
    depositWithConfirmation().catch((error) => {
      console.error('Failed to initialize deposit:', error);
    });
  }, [depositWithConfirmation, navigation]);

  const handleWithdrawFunds = useCallback(() => {
    setIsBottomSheetVisible(false);
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.WITHDRAW,
    });
  }, [navigation]);

  const handleStartTrading = useCallback(() => {
    // Navigate to tutorial carousel for first-time users
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.TUTORIAL,
    });
  }, [navigation]);

  const renderPositionsSection = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings('perps.position.list.loading')}
          </Text>
        </View>
      );
    }

    if (isFirstTimeUser) {
      return (
        <View style={styles.firstTimeContainer}>
          <Icon
            name={IconName.Details}
            color={IconColor.Muted}
            size={firstTimeUserIconSize}
            style={styles.firstTimeIcon}
          />
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            style={styles.firstTimeTitle}
          >
            {strings('perps.position.list.first_time_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.firstTimeDescription}
          >
            {strings('perps.position.list.first_time_description')}
          </Text>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={strings('perps.position.list.start_trading')}
            onPress={handleStartTrading}
            style={styles.startTradingButton}
            width={ButtonWidthTypes.Full}
          />
        </View>
      );
    }

    if (positions.length === 0) {
      // Regular empty state for returning users
      return (
        <View style={styles.emptyContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('perps.position.list.empty_title')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.emptyText}
          >
            {strings('perps.position.list.empty_description')}
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text variant={TextVariant.BodyMDMedium} style={styles.sectionTitle}>
            {strings('perps.position.title')}
          </Text>
        </View>
        <View>
          {positions.map((position, index) => (
            <PerpsPositionCard
              key={`${position.coin}-${index}`}
              position={position}
              expanded={false}
              showIcon
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      {isFirstTimeUser ? (
        <View style={[styles.content, styles.firstTimeContent]}>
          <View style={styles.section}>{renderPositionsSection()}</View>
        </View>
      ) : (
        <>
          <PerpsTabControlBar onManageBalancePress={handleManageBalancePress} />
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            <View style={styles.section}>{renderPositionsSection()}</View>
          </ScrollView>
        </>
      )}

      {isBottomSheetVisible && (
        <Modal visible transparent animationType="fade">
          <BottomSheet
            ref={bottomSheetRef}
            onClose={handleCloseBottomSheet}
            shouldNavigateBack={false}
          >
            <BottomSheetHeader onClose={handleCloseBottomSheet}>
              <Text variant={TextVariant.HeadingMD}>
                {strings('perps.manage_balance')}
              </Text>
            </BottomSheetHeader>
            <View style={styles.bottomSheetContent}>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.add_funds')}
                onPress={handleAddFunds}
                style={styles.actionButton}
                startIconName={IconName.Add}
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.withdraw')}
                onPress={handleWithdrawFunds}
                style={styles.actionButton}
                startIconName={IconName.Minus}
              />
            </View>
          </BottomSheet>
        </Modal>
      )}
    </View>
  );
};

export default PerpsTabView;
