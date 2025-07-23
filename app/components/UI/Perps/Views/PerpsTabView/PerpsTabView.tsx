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
import type { Theme } from '../../../../../util/theme/models';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsTabControlBar } from '../../components/PerpsTabControlBar';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import { usePerpsConnection, usePerpsTrading } from '../../hooks';
import type { Position } from '../../controllers/types';
import { strings } from '../../../../../../locales/i18n';

interface PerpsTabViewProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    sectionTitle: {
      paddingTop: 8,
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center' as const,
    },
    emptyText: {
      textAlign: 'center' as const,
      marginTop: 8,
    },
    loadingContainer: {
      padding: 24,
      alignItems: 'center' as const,
    },
    bottomSheetContent: {
      padding: 24,
    },
    actionButton: {
      marginBottom: 12,
    },
  };
};

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { getPositions, getAccountState } = usePerpsTrading();
  const { isConnected, isInitialized } = usePerpsConnection();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const loadPositions = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const positionsData = await getPositions();
        setPositions(positionsData || []);
      } catch (error) {
        console.error('Failed to load positions:', error);
        setPositions([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getPositions],
  );

  // Automatically load account state on mount and when network changes
  useEffect(() => {
    // Only load account state if we're connected and initialized
    if (isConnected && isInitialized) {
      // Fire and forget - errors are already handled in getAccountState
      // and stored in the controller's state
      getAccountState();
    }
  }, [getAccountState, isConnected, isInitialized]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const handleRefresh = useCallback(() => {
    loadPositions(true);
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
              onPress={handleCloseBottomSheet}
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
