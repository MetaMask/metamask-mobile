import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  selectSelectableVenues,
  useActiveVenue,
  type PredictConfiguredVenue,
} from '../../implementation';

export interface VenueSelection {
  /** Venues a Venue Selection Preference may name; empty when there is no choice. */
  selectableVenues: readonly PredictConfiguredVenue[];
  /** The Active Venue, or `undefined` while it is resolving. */
  activeVenue: PredictConfiguredVenue | undefined;
  /** Stores `venue` as the Venue Selection Preference and opens its home. */
  selectVenue: (venue: PredictConfiguredVenue) => void;
}

/**
 * The venue picker's state and its one action. Selecting a Venue only
 * writes the Venue Selection Preference: resolution, availability,
 * eligibility and readiness keep applying unchanged.
 */
export const useVenueSelection = (): VenueSelection => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const selectableVenues = useSelector(selectSelectableVenues);
  const activeVenueResolution = useActiveVenue();
  const activeVenue =
    activeVenueResolution.status === 'ready'
      ? activeVenueResolution.venue
      : undefined;

  const selectVenue = useCallback(
    (venue: PredictConfiguredVenue) => {
      // TODO(PRED-1273): switch to the Predict venue-selection events once
      // that vocabulary exists. Until then this reuses the generic settings
      // event rather than inventing a parallel analytics path.
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
          .addProperties({
            settings_group: 'predict',
            settings_type: 'venue_selection',
            old_value: activeVenue ?? null,
            new_value: venue,
          })
          .build(),
      );
      // Re-enter the root route at its home, without legacy market-list
      // parameters. Navigate before the preference lands: the change remounts
      // this screen.
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
      // The root route remounts on the chosen Venue's home. Order handling
      // reacts to the resolved Active Venue, not to this call (PRED-1383).
      Engine.controllerMessenger.call(
        'PredictVenueController:setVenueSelectionPreference',
        venue,
      );
    },
    [activeVenue, createEventBuilder, navigation, trackEvent],
  );

  return { selectableVenues, activeVenue, selectVenue };
};
