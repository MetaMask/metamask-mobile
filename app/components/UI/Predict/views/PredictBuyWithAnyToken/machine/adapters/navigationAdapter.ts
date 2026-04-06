import { StackActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { NavigationPort } from '../ports';

export function createNavigationAdapter(
  navigation: StackNavigationProp<Record<string, undefined>>,
): NavigationPort {
  return {
    pop: () => navigation.dispatch(StackActions.pop()),

    onTransitionEnd: (cb) =>
      navigation.addListener('transitionEnd', (e) => {
        if (!e.data.closing) {
          cb();
        }
      }),

    onBeforeRemove: (cb) => navigation.addListener('beforeRemove', cb),
  };
}
