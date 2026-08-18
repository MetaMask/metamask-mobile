import React, { useContext } from 'react';
import {
  NavigationContext,
  NavigationRouteContext,
  useNavigationState,
  useRoute,
} from '@react-navigation/native';

export interface UnmountOnTabBlurProps {
  children: React.ReactNode;
}

/**
 * Renders children only while this screen is the selected tab.
 * Unlike `useIsFocused`, parent modals do not count as a blur.
 */
const UnmountOnSelectedRouteChange: React.FC<UnmountOnTabBlurProps> = ({
  children,
}) => {
  const route = useRoute();
  const selectedRouteKey = useNavigationState(
    (state) => state.routes[state.index]?.key,
  );

  if (selectedRouteKey !== route.key) {
    return null;
  }

  return children;
};

/**
 * Unmounts children while another tab is selected.
 * Drop-in for the `unmountOnBlur` tab option removed in React Navigation v7.
 */
export const UnmountOnTabBlur: React.FC<UnmountOnTabBlurProps> = ({
  children,
}) => {
  const route = useContext(NavigationRouteContext);
  const navigation = useContext(NavigationContext);

  // Outside a navigator (e.g. unit tests) there is no blur state — render as-is.
  if (!route || !navigation) {
    return children;
  }

  return (
    <UnmountOnSelectedRouteChange>{children}</UnmountOnSelectedRouteChange>
  );
};

/**
 * Wraps a tab screen so it unmounts when another tab is selected.
 * Define at module scope to keep a stable component identity.
 *
 * Pair with `freezeOnBlur: false` on the tab options — this wrapper unmounts
 * from inside the screen, and a frozen screen blocks that unmount.
 *
 * @param TabScreen - The tab screen component to wrap.
 * @returns The wrapped tab screen component.
 */
export function withUnmountOnTabBlur<P extends object>(
  TabScreen: React.ComponentType<P>,
): React.FC<P> {
  const WithUnmountOnTabBlur: React.FC<P> = (props) => (
    <UnmountOnTabBlur>
      <TabScreen {...props} />
    </UnmountOnTabBlur>
  );

  WithUnmountOnTabBlur.displayName = `WithUnmountOnTabBlur(${
    TabScreen.displayName || TabScreen.name || 'Component'
  })`;

  return WithUnmountOnTabBlur;
}

export default UnmountOnTabBlur;
