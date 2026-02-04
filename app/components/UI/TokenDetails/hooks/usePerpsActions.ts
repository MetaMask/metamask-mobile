import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsEventValues } from '../../Perps/constants/eventNames';
import { CONFIRMATION_HEADER_CONFIG } from '../../Perps/constants/perpsConfig';
import PerpsConnectionManager from '../../Perps/services/PerpsConnectionManager';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

export interface UsePerpsActionsParams {
  symbol: string;
}

export interface UsePerpsActionsResult {
  hasPerpsMarket: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  handleLongPress: (() => void) | undefined;
  handleShortPress: (() => void) | undefined;
}

// TODO: Replace with actual logic ( no open position+ has funds)
// Needs to have this data without establishing connection
const shouldRedirectToOrderView = true;

/**
 * usePerpsActions Hook
 *
 * Provides navigation handlers for opening long/short perps positions
 * from the token details screen.
 *
 * When shouldRedirectToOrderView is true:
 * - Establishes Perps connection on mount (background, non-blocking)
 * - Long/Short buttons navigate directly to Order View
 *
 * When shouldRedirectToOrderView is false:
 * - Long/Short buttons navigate to Market Details (original flow)
 *
 * @param params - Token symbol
 * @returns Object with hasPerpsMarket, isLoading, isConnecting, handleLongPress, handleShortPress
 */
export const usePerpsActions = ({
  symbol,
}: UsePerpsActionsParams): UsePerpsActionsResult => {
  const navigation = useNavigation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const { hasPerpsMarket, marketData, isLoading } =
    usePerpsMarketForAsset(symbol);

  /**
   * Establish Perps connection in background when conditions are met.
   * This pre-warms the connection so it's ready when user clicks Long/Short.
   */
  useEffect(() => {
    if (shouldRedirectToOrderView && hasPerpsMarket) {
      setIsConnecting(true);
      PerpsConnectionManager.connect()
        .then(() => {
          Logger.log('[usePerpsActions] Connection established');
        })
        .catch((error) => {
          // Silent fail - will fallback to Market Details if needed
          Logger.log('[usePerpsActions] Connection failed:', error);
        })
        .finally(() => {
          setIsConnecting(false);
        });
    }
  }, [hasPerpsMarket]);

  /**
   * Navigate to Order View after calling depositWithOrder
   */
  const navigateToOrderView = useCallback(
    async (direction: 'long' | 'short') => {
      if (!marketData || isNavigating) return;

      setIsNavigating(true);

      try {
        // Prepare the deposit transaction
        Logger.log('[usePerpsActions] Calling depositWithOrder...');
        await Engine.context.PerpsController.depositWithOrder();
        Logger.log(
          '[usePerpsActions] depositWithOrder complete, navigating...',
        );

        // Navigate to Order View
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          params: {
            direction,
            asset: marketData.symbol,
            source: PerpsEventValues.SOURCE.ASSET_DETAIL_SCREEN,
            showPerpsHeader:
              CONFIRMATION_HEADER_CONFIG.ShowPerpsHeaderForDepositAndTrade,
          },
        });
      } catch (error) {
        Logger.error(error as Error, {
          message: '[usePerpsActions] Failed to navigate to Order View',
        });
        // Fallback to Market Details on error
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: marketData,
            source: PerpsEventValues.SOURCE.ASSET_DETAIL_SCREEN,
          },
        });
      } finally {
        setIsNavigating(false);
      }
    },
    [navigation, marketData, isNavigating],
  );

  /**
   * Navigate to Market Details (original flow)
   */
  const navigateToMarketDetails = useCallback(() => {
    if (!marketData) return;

    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: marketData,
        source: PerpsEventValues.SOURCE.ASSET_DETAIL_SCREEN,
      },
    });
  }, [navigation, marketData]);

  const handleLongPress = useCallback(() => {
    if (shouldRedirectToOrderView) {
      navigateToOrderView('long');
    } else {
      navigateToMarketDetails();
    }
  }, [navigateToOrderView, navigateToMarketDetails]);

  const handleShortPress = useCallback(() => {
    if (shouldRedirectToOrderView) {
      navigateToOrderView('short');
    } else {
      navigateToMarketDetails();
    }
  }, [navigateToOrderView, navigateToMarketDetails]);

  return useMemo(
    () => ({
      hasPerpsMarket,
      isLoading,
      isConnecting,
      handleLongPress: hasPerpsMarket ? handleLongPress : undefined,
      handleShortPress: hasPerpsMarket ? handleShortPress : undefined,
    }),
    [
      hasPerpsMarket,
      isLoading,
      isConnecting,
      handleLongPress,
      handleShortPress,
    ],
  );
};
