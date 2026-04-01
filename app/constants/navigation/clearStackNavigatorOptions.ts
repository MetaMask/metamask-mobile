import type { StackNavigationOptions } from '@react-navigation/stack';

/** Transparent stack with no transition animation; used for modal-style flows. */
export const clearStackNavigatorOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  cardStyleInterpolator: () => ({
    overlayStyle: {
      opacity: 0,
    },
  }),
  animationEnabled: false,
};
