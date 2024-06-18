import {
  withMockStore,
  withTheme,
  withNavigation,
  withSafeArea,
} from './decorators';

export const decorators = [
  withSafeArea,
  withNavigation,
  withTheme,
  withMockStore,
];

export const parameters = {
  controls: {},
};
