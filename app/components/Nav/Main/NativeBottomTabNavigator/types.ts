import type {
  BottomTabNavigationConfig,
  BottomTabNavigationEventMap,
  BottomTabNavigationOptions as JSBottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import type {
  Descriptor,
  NavigationHelpers,
  ParamListBase,
  RouteProp,
  TabNavigationState,
} from '@react-navigation/native';
import type { ColorValue, ImageSourcePropType, TextStyle } from 'react-native';

export type NativeTabBarIcon =
  | {
      type: 'sfSymbol';
      name: string;
    }
  | {
      type: 'imageSource';
      imageSource: ImageSourcePropType;
    }
  | {
      type: 'drawableResource';
      name: string;
    }
  | {
      ios?:
        | { type: 'sfSymbol'; name: string }
        | { type: 'imageSource'; imageSource: ImageSourcePropType };
      android?:
        | { type: 'imageSource'; imageSource: ImageSourcePropType }
        | { type: 'drawableResource'; name: string };
    };

export type NativeBottomTabNavigationOptions = Omit<
  JSBottomTabNavigationOptions,
  'tabBarIcon'
> & {
  /**
   * Native tab bar icon. React elements are not supported.
   */
  tabBarIcon?:
    | NativeTabBarIcon
    | ((props: {
        focused: boolean;
        color: ColorValue;
        size: number;
      }) => NativeTabBarIcon);
  /**
   * When false, native selection is prevented and `tabPress` is emitted instead.
   * Use for action tabs (e.g. Trade) that open a modal.
   */
  tabBarSelectionEnabled?: boolean;
  tabBarLabelStyle?: TextStyle;
};

export type NativeBottomTabDescriptor = Descriptor<
  NativeBottomTabNavigationOptions,
  NavigationHelpers<ParamListBase>,
  RouteProp<ParamListBase>
>;

export type NativeBottomTabDescriptorMap = Record<
  string,
  NativeBottomTabDescriptor
>;

export type NativeBottomTabNavigationHelpers = NavigationHelpers<
  ParamListBase,
  BottomTabNavigationEventMap
> & {
  emit: (event: {
    type: string;
    target?: string;
    canPreventDefault?: boolean;
    data?: unknown;
  }) => { defaultPrevented: boolean };
};

export type NativeBottomTabViewProps = BottomTabNavigationConfig & {
  state: TabNavigationState<ParamListBase>;
  navigation: NativeBottomTabNavigationHelpers;
  descriptors: NativeBottomTabDescriptorMap;
};
