import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import useRampsSmartRouting from './hooks/useRampsSmartRouting';
import useRampsProviders from './hooks/useRampsProviders';
import useRampsPaymentMethods from './hooks/useRampsPaymentMethods';
import { selectUserRegion } from '../../../selectors/rampsController';
import Engine from '../../../core/Engine';

/**
 * Ramps app bootstrap: runs smart routing, controller hydration, and provider
 * auto-selection as soon as the app mounts so that by the time the user taps
 * Buy, region, providers, tokens, and selected provider are ready.
 *
 * Geolocation is handled by GeolocationController during Engine startup, so
 * this bootstrap no longer performs geolocation detection itself.
 *
 * V2: RampsController is initialized by Engine (rampsControllerInit). Provider
 * auto-selection runs when providers load. Mount at app root.
 *
 * Tokens, providers, and payment methods are all fetched here so they are
 * ready when the user enters the buy flow.
 */
function RampsBootstrap(): null {
  useRampsSmartRouting();
  useRampsProviders({ enableSideEffects: true });
  useRampsPaymentMethods();

  // Fetch tokens when region is available. Tokens don't use React Query
  // (they're needed for controller-side validation in setSelectedToken),
  // so we trigger the fetch directly.
  const userRegion = useSelector(selectUserRegion);
  useEffect(() => {
    if (userRegion?.regionCode) {
      Engine.context.RampsController.getTokens(userRegion.regionCode, 'buy');
    }
  }, [userRegion?.regionCode]);

  return null;
}

export default RampsBootstrap;
