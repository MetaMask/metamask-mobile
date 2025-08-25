import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import styleSheet from './PerpsTabView.styles';
import { PerpsTabControlBar } from '../../components/PerpsTabControlBar';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import {
  usePerpsConnection,
  usePerpsPositions,
  usePerpsTrading,
} from '../../hooks';
import { strings } from '../../../../../../locales/i18n';

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { getAccountState } = usePerpsTrading();
  const { isConnected, isInitialized } = usePerpsConnection();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { positions, isLoading, isRefreshing, loadPositions } =
    usePerpsPositions();

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

    if (positions.length === 0) {
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
              isInPerpsNavContext={false}
              rightAccessory={
                <ButtonIcon
                  iconName={IconName.Close}
                  iconColor={IconColor.Alternative}
                  size={ButtonIconSizes.Md}
                />
              }
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      <PerpsTabControlBar onManageBalancePress={handleManageBalancePress} />
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.section}>{renderPositionsSection()}</View>
      </ScrollView>

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
