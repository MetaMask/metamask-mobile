import {
  withMockStore,
  withTheme,
  withNavigation,
  withSafeArea,
} from './decorators';

export const decorators = [
  withTheme,
  withSafeArea,
  withNavigation,
  withMockStore,
];

export const parameters = {
  controls: {},
};
