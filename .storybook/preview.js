import {
  withMockStore,
  withTheme,
  withNavigation,
  withSafeArea,
  withToaster,
} from './decorators';

export const decorators = [
  withTheme,
  withToaster,
  withSafeArea,
  withNavigation,
  withMockStore,
];

export const parameters = {
  controls: {},
};
