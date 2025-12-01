import {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import { IUseMetricsHook } from '../../hooks/useMetrics';

export interface OptinMetricsRouteParams {
  onContinue?: () => void;
}

/**
 * Props that come from navigation
 */
export interface OptinMetricsNavigationProps {
  /**
   * Navigation object required to push and pop other views
   */
  navigation: NavigationProp<ParamListBase>;
  /**
   * Object that represents the current route info like params passed to it
   */
  route: RouteProp<{ params: OptinMetricsRouteParams }, 'params'>;
}

/**
 * Props injected by Redux connect mapStateToProps
 */
export interface OptinMetricsStateProps {
  /**
   * Onboarding events array created in previous onboarding views
   */
  events: unknown[];
}

/**
 * Props injected by Redux connect mapDispatchToProps
 */
export interface OptinMetricsDispatchProps {
  /**
   * Action to erase any event stored in onboarding state
   */
  clearOnboardingEvents: () => void;
  /**
   * Action to set data collection for marketing
   */
  setDataCollectionForMarketing: (value: boolean) => void;
}

/**
 * Full props for the component (all props combined)
 */
export interface OptinMetricsProps
  extends OptinMetricsNavigationProps,
    OptinMetricsStateProps,
    OptinMetricsDispatchProps {
  /**
   * Metrics injected by withMetricsAwareness HOC
   */
  metrics: IUseMetricsHook;
}

export interface LinkParams {
  url: string;
  title: string;
}
