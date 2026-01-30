import React from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Higher-order component that provides navigation prop to class components.
 * This is a replacement for the deprecated @react-navigation/compat withNavigation.
 *
 * For functional components, prefer using the useNavigation hook directly.
 *
 * @example
 * // Class component usage
 * class MyComponent extends PureComponent {
 *   handlePress = () => {
 *     this.props.navigation.navigate('SomeScreen');
 *   };
 * }
 * export default withNavigation(MyComponent);
 */
export function withNavigation<
  P extends { navigation?: ReturnType<typeof useNavigation> },
>(
  Component: React.ComponentType<P>,
): React.ComponentType<Omit<P, 'navigation'>> {
  function WithNavigationWrapper(props: Omit<P, 'navigation'>) {
    const navigation = useNavigation();
    return <Component {...(props as P)} navigation={navigation} />;
  }

  WithNavigationWrapper.displayName = `withNavigation(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WithNavigationWrapper;
}

export default withNavigation;
