import { useCallback, useEffect } from 'react';
import { getSdkEnvironment } from '../Deposit/sdk/getSdkEnvironment';
import { SdkEnvironment } from '@consensys/native-ramps-sdk';
import { useDispatch } from 'react-redux';
import { setDetectedGeolocation } from '../../../../reducers/fiatOrders';
import Logger from '../../../../util/Logger';

const GEOLOCATION_URLS = {
  DEV: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
  PROD: 'https://on-ramp.api.cx.metamask.io/geolocation',
};

export default function useDetectGeolocation(): void {
  const nativeRampEnvironment = getSdkEnvironment();
  const dispatch = useDispatch();
  const url =
    nativeRampEnvironment === SdkEnvironment.Production
      ? GEOLOCATION_URLS.PROD
      : GEOLOCATION_URLS.DEV;

  const detectGeolocation = useCallback(async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        // HTTP error responses (502, 404, etc.) are server-side issues —
        // not actionable by the mobile client, so don't report to Sentry.
        return;
      }
      const geolocation = await response.text();

      dispatch(setDetectedGeolocation(geolocation || undefined));
    } catch (error) {
      Logger.error(
        error as Error,
        'useDetectGeolocation: Failed to detect geolocation',
      );
    }
  }, [dispatch, url]);

  useEffect(() => {
    detectGeolocation();
  }, [detectGeolocation]);
}
