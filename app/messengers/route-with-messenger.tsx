import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { UIMessengerActions, UIMessengerEvents } from './ui-messenger';
import { RouteMessengerContext } from '../contexts/route-messenger';
import { useUIMessenger } from '../contexts/ui-messenger';
import { createRouteMessenger, type RouteMessenger } from './route-messenger';
import { captureException } from '@sentry/react-native';

/**
 * Utility component which creates a messenger representing a route and
 * provides it to children via context.
 *
 * Do not use this component directly. Instead, use the `withMessenger` HOC to
 * wrap route components, which will render this component internally.
 *
 * @param props - Component props.
 * @param props.path - The path of the route. This is used for debugging
 * purposes and to ensure that the route messenger's namespace is unique across
 * routes.
 * @param props.capabilities - Capabilities to delegate to the route messenger.
 * This must be a stable object (i.e. it should be memoized if defined inline)
 * to avoid unnecessary re-delegation on every render.
 * @param props.capabilities.actions - Action types to delegate to the route
 * messenger.
 * @param props.capabilities.events - Event types to delegate to the route
 * messenger.
 * @param props.children - Child components.
 */
export const RouteWithMessenger = ({
  path,
  capabilities,
  children,
}: {
  path: string;
  capabilities: {
    actions?: UIMessengerActions['type'][];
    events?: UIMessengerEvents['type'][];
  };
  children: ReactNode;
}) => {
  const uiMessenger = useUIMessenger();
  const routeMessengerRef = useRef<RouteMessenger | null>(null);
  const [isDelegated, setDelegated] = useState(false);

  // `useMemo` doesn't work here because `capabilities` is an object, so we use
  // a ref instead to ensure that we only create the route messenger once.
  if (!routeMessengerRef.current) {
    routeMessengerRef.current = createRouteMessenger({ path });
  }

  useEffect(() => {
    const messenger = routeMessengerRef.current;
    if (!messenger) {
      return;
    }

    const { actions, events } = capabilities;
    uiMessenger
      .delegate({ messenger, actions, events })
      .then(() => setDelegated(true))
      .catch(captureException);

    return () => {
      uiMessenger
        .revoke({ messenger, actions, events })
        .then(() => setDelegated(false))
        .catch(captureException);
    };
  }, [uiMessenger, capabilities]);

  const routeMessenger = routeMessengerRef.current;

  // Wait for delegation to complete before rendering children, to ensure that
  // the route messenger has access to the delegated capabilities when children
  // are rendered.
  if (!isDelegated) {
    return null;
  }

  return (
    <RouteMessengerContext.Provider value={routeMessenger}>
      {children}
    </RouteMessengerContext.Provider>
  );
};
