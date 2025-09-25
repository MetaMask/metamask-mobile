import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  setSeasonStatus,
  setSeasonStatusError,
} from '../../../../actions/rewards';
import { useDispatch, useSelector } from 'react-redux';
import { setSeasonStatusLoading } from '../../../../reducers/rewards';
import { CURRENT_SEASON_ID } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  selectRewardsSubscriptionId,
  selectSeasonStatusError,
} from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { handleRewardsErrorMessage } from '../utils';
import Routes from '../../../../constants/navigation/Routes';
import { ModalType } from '../components/RewardsBottomSheetModal';
import { strings } from '../../../../../locales/i18n';
import { ButtonVariant } from '@metamask/design-system-react-native';

/**
 * Custom hook to fetch and manage season status data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useSeasonStatus = (): void => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isLoadingRef = useRef(false);
  const seasonStatusError = useSelector(selectSeasonStatusError);
  const fetchSeasonStatus = useCallback(async (): Promise<void> => {
    // Don't fetch if no subscriptionId
    if (!subscriptionId) {
      dispatch(setSeasonStatus(null));
      dispatch(setSeasonStatusLoading(false));
      return;
    }

    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;

    dispatch(setSeasonStatusLoading(true));

    try {
      const statusData = await Engine.controllerMessenger.call(
        'RewardsController:getSeasonStatus',
        subscriptionId,
        CURRENT_SEASON_ID,
      );

      dispatch(setSeasonStatus(statusData));
      dispatch(setSeasonStatusError(null));
    } catch (error) {
      const errorMessage = handleRewardsErrorMessage(error);
      dispatch(setSeasonStatusError(errorMessage));
    } finally {
      isLoadingRef.current = false;
      dispatch(setSeasonStatusLoading(false));
    }
  }, [dispatch, subscriptionId]);

  useEffect(() => {
    if (!seasonStatusError || !subscriptionId) return;

    // Show modal when no existing data
    navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
      title: strings('rewards.season_status_error.error_fetching_title'),
      description: strings(
        'rewards.season_status_error.error_fetching_description',
      ),
      type: ModalType.Danger,
      confirmAction: {
        label: strings('rewards.season_status_error.retry_button'),
        onPress: () => {
          navigation.goBack();
          dispatch(setSeasonStatusError(null));
          fetchSeasonStatus();
        },
        variant: ButtonVariant.Primary,
      },
      showCancelButton: true,
      cancelLabel: strings('rewards.season_status_error.dismiss_button'),
    });
  }, [
    seasonStatusError,
    fetchSeasonStatus,
    navigation,
    dispatch,
    subscriptionId,
  ]);

  // Refresh data when screen comes into focus (each time page is visited)
  useFocusEffect(
    useCallback(() => {
      fetchSeasonStatus();
    }, [fetchSeasonStatus]),
  );

  useInvalidateByRewardEvents(
    [
      'RewardsController:accountLinked',
      'RewardsController:rewardClaimed',
      'RewardsController:balanceUpdated',
    ],
    fetchSeasonStatus,
  );
};
