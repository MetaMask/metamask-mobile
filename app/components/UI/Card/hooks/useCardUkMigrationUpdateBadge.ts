import { useSelector } from 'react-redux';
import { useCardUkMigrationState } from './useCardUkMigrationState';
import {
  selectCardActiveProviderId,
  selectCardCountryOfResidence,
  selectHasCompletedCardMigration,
} from '../../../../selectors/cardController';
import {
  getCardUkMigrationUpdateBadgeSeverity,
  isCardUkMigrationEligible,
  type CardUkMigrationUpdateBadgeSeverity,
} from '../../../../selectors/featureFlagController/card';

/**
 * Resolves the Accounts menu update badge for eligible Baanx UK users.
 *
 * Keeps Card provider, residency, feature flag, and schedule details inside
 * the Card feature boundary.
 */
export function useCardUkMigrationUpdateBadge(): CardUkMigrationUpdateBadgeSeverity | null {
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const countryOfResidence = useSelector(selectCardCountryOfResidence);
  const hasCompletedMigration = useSelector(selectHasCompletedCardMigration);
  const { state } = useCardUkMigrationState();

  const isEligible = isCardUkMigrationEligible(state, {
    providerId: activeProviderId,
    regionCode: countryOfResidence,
    hasCompletedMigration,
  });

  return isEligible ? getCardUkMigrationUpdateBadgeSeverity(state) : null;
}
