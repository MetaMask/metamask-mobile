import { useMusdBalance } from '../../Earn/hooks/useMusdBalance';
import { MONEY_EVENTS_CONSTANTS } from '../constants/moneyEvents';

const { MONEY_HUB_STATES } = MONEY_EVENTS_CONSTANTS;

// TODO: Add tests.
/**
 * Helper hook to get common money hub event properties.
 * @returns Object containing:
 * - moneyHubFilledState: 'filled' if the user has mUSD balance on any chain, 'empty' otherwise
 */
const useMoneyHubEvents = () => {
  const { hasMusdBalanceOnAnyChain } = useMusdBalance();

  const moneyHubFilledState = hasMusdBalanceOnAnyChain
    ? MONEY_HUB_STATES.FILLED
    : MONEY_HUB_STATES.EMPTY;

  return {
    moneyHubFilledState,
  };
};

export default useMoneyHubEvents;
