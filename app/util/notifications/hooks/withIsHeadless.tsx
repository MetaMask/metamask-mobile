import React, { useState, useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { isNotificationsFeatureEnabled } from '../constants';

/**
 * For IOS Background Messaging, when in headless mode (silently opening the app), we want to not render the whole app.
 * https://rnfirebase.io/messaging/usage#background-application-state
 * @returns boolean is the application is in headless mode or not
 */
export function useIsHeadless() {
  const [isHeadless, setIsHeadless] = useState(false);

  useEffect(() => {
    if (isNotificationsFeatureEnabled()) {
      const checkHeadless = async () => {
        const headless = await messaging().getIsHeadless();
        setIsHeadless(headless === true);
      };

      checkHeadless();
    } else {
      setIsHeadless(false);
    }
  }, []);

  return isHeadless;
}

/**
 * IOS/Android Headless Mode for background push notifications.
 * When headless, we do not want to render application
 * https://rnfirebase.io/messaging/usage#background-application-state
 */
export const withIsHeadless =
  <Props extends object>(WrappedComponent: React.ComponentType<Props>) =>
  (props: Props) => {
    const isHeadless = useIsHeadless();

    if (isHeadless && isNotificationsFeatureEnabled()) {
      // Do not render the UI if the app is in headless mode
      return null;
    }

    // eslint-disable-next-line react/react-in-jsx-scope
    return <WrappedComponent {...props} />;
  };
