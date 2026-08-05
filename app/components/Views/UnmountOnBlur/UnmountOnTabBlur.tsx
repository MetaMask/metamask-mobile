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
 * Renders children only while this screen is the selected route of its own
 * (closest) navigator, ignoring the focus state of parent navigators.
 *
 * This deliberately differs from `useIsFocused`, which reports `false` as soon
 * as any ancestor navigator pushes a screen or modal on top. For a bottom tab
 * that would mean unmounting on every root-level modal, whereas a tab switch is
 * the only thing we want to react to.
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
 * Unmounts its children while another tab is selected.
 *
 * Replaces the `unmountOnBlur` bottom-tab option, which React Navigation
 * removes in v7. It reproduces that option's condition exactly — v6's
 * `BottomTabView` renders `null` for a tab when `state.index !== index` — so
 * behaviour is unchanged on v6 and stays unchanged once we move to v7, where
 * the option is silently ignored.
 */
export const UnmountOnTabBlur: React.FC<UnmountOnTabBlurProps> = ({
  children,
}) => {
  const route = useContext(NavigationRouteContext);
  const navigation = useContext(NavigationContext);

  // Rendered outside a navigator, e.g. a unit test mounting a tab's component
  // directly. There is no blur state to read, so leave the children alone.
  if (!route || !navigation) {
    return children;
  }

  return (
    <UnmountOnSelectedRouteChange>{children}</UnmountOnSelectedRouteChange>
  );
};

/**
 * Wraps a tab screen component so its subtree is unmounted while another tab is
 * selected. Apply at module scope so the wrapped component keeps a stable
 * identity across renders of the navigator.
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
