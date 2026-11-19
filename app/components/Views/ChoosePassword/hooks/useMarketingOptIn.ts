import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { useMessenger } from '../../../../hooks/useMessenger';
import { RouteMessengerInstance } from '../messenger';
import Logger from '../../../../util/Logger';
import OAuthLoginService from '../../../../core/OAuthService/OAuthService';
import { setDataCollectionForMarketing } from '../../../../actions/security';
import { selectGeolocationLocation } from '../../../../selectors/geolocationController';
import { getDefaultMarketingOptInChecked } from '../../../../util/onboarding/getDefaultMarketingOptInChecked';

/** Marketing opt-in for social-login users; the default depends on geolocation. */
export const useMarketingOptIn = () => {
  const dispatch = useDispatch();
  const messenger = useMessenger<RouteMessengerInstance>();
  const geoLocation = useSelector(selectGeolocationLocation);
  const hasKnownGeolocation =
    geoLocation != null && geoLocation !== UNKNOWN_LOCATION;
  const [isSelected, setIsSelected] = useState(false);
  const [marketingOptInTouched, setMarketingOptInTouched] = useState(false);
  const [resolvedGeolocationLocation, setResolvedGeolocationLocation] =
    useState<string | undefined>(hasKnownGeolocation ? geoLocation : undefined);
  const [isGeolocationResolved, setIsGeolocationResolved] =
    useState(hasKnownGeolocation);

  useEffect(() => {
    if (geoLocation && geoLocation !== UNKNOWN_LOCATION) {
      setResolvedGeolocationLocation(geoLocation);
      setIsGeolocationResolved(true);
      return;
    }

    let cancelled = false;
    setIsGeolocationResolved(false);

    Promise.resolve(messenger.call('GeolocationController:refreshGeolocation'))
      .then((location) => {
        if (!cancelled) {
          setResolvedGeolocationLocation(location);
          setIsGeolocationResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedGeolocationLocation(undefined);
          setIsGeolocationResolved(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [geoLocation, messenger]);

  const marketingOptInChecked = useMemo(() => {
    if (marketingOptInTouched) {
      return isSelected;
    }

    return getDefaultMarketingOptInChecked(true, resolvedGeolocationLocation);
  }, [marketingOptInTouched, isSelected, resolvedGeolocationLocation]);

  const setSelection = useCallback(() => {
    setMarketingOptInTouched(true);
    setIsSelected((prev) => {
      if (!marketingOptInTouched) {
        return !getDefaultMarketingOptInChecked(
          true,
          resolvedGeolocationLocation,
        );
      }

      return !prev;
    });
  }, [marketingOptInTouched, resolvedGeolocationLocation]);

  const applyMarketingOptIn = useCallback(
    (isOptedIn: boolean) => {
      dispatch(setDataCollectionForMarketing(isOptedIn));
      OAuthLoginService.updateMarketingOptInStatus(isOptedIn).catch((err) => {
        Logger.error(err);
      });
    },
    [dispatch],
  );

  return {
    marketingOptInChecked,
    setSelection,
    isGeolocationResolved,
    isAwaitingGeolocation: !isGeolocationResolved,
    applyMarketingOptIn,
  };
};
