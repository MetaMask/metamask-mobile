import { useCallback } from 'react';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { TokenI } from '../../Tokens/types';
import { EarnTokenDetails } from '../types/lending.types';

// Add more in the future
export type EventAnalyticsLoggingStrategy =
  | 'LOG_STABLECOIN_LEND_EVENT'
  | 'LOG_STABLECOIN_WITHDRAWAL_EVENT'
  | 'LOG_STAKING_EVENT'
  | 'SKIP_EVENT_LOGGING';

export interface UseEarnEventLoggingParams {
  earnToken?: EarnTokenDetails;
  isStablecoinLendingEnabled: boolean;
  token: TokenI;
  actionType: 'deposit' | 'withdrawal';
}

export const useEarnAnalyticsEventLogging = ({
  earnToken,
  isStablecoinLendingEnabled,
  token,
  actionType,
}: UseEarnEventLoggingParams) => {
  const getEventLoggingStrategy =
    useCallback((): EventAnalyticsLoggingStrategy => {
      if (
        earnToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING &&
        isStablecoinLendingEnabled
      ) {
        return actionType === 'deposit'
          ? 'LOG_STABLECOIN_LEND_EVENT'
          : 'LOG_STABLECOIN_WITHDRAWAL_EVENT';
      }

      // assume it's a staking experience
      if (!isStablecoinLendingEnabled || token.isETH) {
        return 'LOG_STAKING_EVENT';
      }

      return 'SKIP_EVENT_LOGGING';
    }, [
      earnToken?.experience,
      isStablecoinLendingEnabled,
      token.isETH,
      actionType,
    ]);

  const shouldLogStablecoinEvent = useCallback(() => {
    const strategy = getEventLoggingStrategy();
    return (
      strategy === 'LOG_STABLECOIN_LEND_EVENT' ||
      strategy === 'LOG_STABLECOIN_WITHDRAWAL_EVENT'
    );
  }, [getEventLoggingStrategy]);

  const shouldLogStakingEvent = useCallback(() => {
    const strategy = getEventLoggingStrategy();
    return strategy === 'LOG_STAKING_EVENT';
  }, [getEventLoggingStrategy]);

  return {
    shouldLogStablecoinEvent,
    shouldLogStakingEvent,
  };
};
