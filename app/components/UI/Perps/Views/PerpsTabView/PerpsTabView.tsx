import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
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
import PerpsPositionCard from '../../components/PerpsPositionCard';
import { PerpsTabControlBar } from '../../components/PerpsTabControlBar';
import type { PerpsNavigationParamList } from '../../controllers/types';
import {
  usePerpsConnection,
  usePerpsFirstTimeUser,
  usePerpsPositions,
  usePerpsTrading,
} from '../../hooks';
import styleSheet from './PerpsTabView.styles';

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { getAccountState } = usePerpsTrading();
  const { isConnected, isInitialized } = usePerpsConnection();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

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
  // Automatically load account state on mount and when network changes
  useEffect(() => {
    // Only load account state if we're connected and initialized
    if (isConnected && isInitialized) {
      // Fire and forget - errors are already handled in getAccountState
      // and stored in the controller's state
      getAccountState();
    }
  }, [getAccountState, isConnected, isInitialized]);

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
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.DEPOSIT,
    });
  }, [navigation]);

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
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Alternative}
            style={styles.sectionTitle}
          >
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
        <BottomSheet ref={bottomSheetRef} onClose={handleCloseBottomSheet}>
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
      )}
    </View>
  );
};

export default PerpsTabView;
