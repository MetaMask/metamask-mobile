import type { ImageSourcePropType } from 'react-native';
import type {
  NavigationState,
  PartialState,
  Route,
} from '@react-navigation/native';
import type { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';

export type HomeTabKey =
  | 'home'
  | 'explore'
  | 'trade'
  | 'browser'
  | 'activity'
  | 'money'
  | 'rewards'
  | 'social';

export type HomeTabRoute = Route<string> & {
  state?: NavigationState | PartialState<NavigationState>;
};

export interface NativeTabIconPair {
  source: ImageSourcePropType;
  selectedSource: ImageSourcePropType;
}

/** One bottom tab, mapped to both the JS and native navigators. */
export interface HomeTabDefinition {
  key: HomeTabKey;
  name: string;
  iconKey: TabBarIconKey;
  rootScreenName: string;
  nativeIcon?: NativeTabIconPair;
  /** iOS 26 system symbol. Used instead of `nativeIcon` when set. */
  nativeSfSymbol?: string;
  onPress?: () => void;
  onLeave?: () => void;
  freezeOnBlur?: boolean;
  isHidden?: boolean;
  showNewBadge?: boolean;
  /**
   * Native iOS 26 bar only. `false` stops UIKit from selecting the tab on tap
   * so a listener can decide first. Programmatic `navigate` still selects it.
   */
  tabBarSelectionEnabled?: boolean;
  isSelected?: (rootScreenName: string) => boolean;
  hidesTabBarFor?: (route: HomeTabRoute) => boolean;
}
