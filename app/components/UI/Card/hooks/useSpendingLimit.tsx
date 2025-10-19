import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useMetrics, MetaMetricsEvents } from '../../../hooks/useMetrics';
import Routes from '../../../../constants/navigation/Routes';

export interface SpendingLimitState {
  isFullAccess: boolean;
  limitAmount?: string;
}

export const useSpendingLimit = () => {
  const [spendingLimit, setSpendingLimit] = useState<SpendingLimitState>({
    isFullAccess: false,
    limitAmount: '1000',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const saveSpendingLimit = useCallback(
    async (limitData: SpendingLimitState) => {
      setIsLoading(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setSpendingLimit(limitData);

        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_SPENDING_LIMIT_UPDATED)
            .addProperties({
              is_full_access: limitData.isFullAccess,
              limit_amount: limitData.limitAmount,
            })
            .build(),
        );

        navigation.goBack();
      } catch (error) {
        console.error('Failed to save spending limit:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [navigation, trackEvent, createEventBuilder],
  );

  const navigateToSpendingLimit = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_SPENDING_LIMIT_CLICKED).build(),
    );
    navigation.navigate(Routes.CARD.SPENDING_LIMIT as never);
  }, [navigation, trackEvent, createEventBuilder]);

  return {
    spendingLimit,
    saveSpendingLimit,
    navigateToSpendingLimit,
    isLoading,
  };
};
