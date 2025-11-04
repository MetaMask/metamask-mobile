import React from 'react';
import { Provider } from 'react-redux';
import { render, RenderResult } from '@testing-library/react-native';

import App from '../../app/components/Nav/App';
import ThemeProvider from '../../app/component-library/providers/ThemeProvider/ThemeProvider';
import NavigationProvider from '../../app/components/Nav/NavigationProvider';
import configureStore from '../../app/util/test/configureStore';
import ReduxService from '../../app/core/redux/ReduxService';
import { RootState } from '../../app/reducers';

type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T | undefined;

export type IntegrationProviderValues = {
  state?: DeepPartial<RootState>;
};

export function renderAppWithProviders(
  providerValues?: IntegrationProviderValues,
): RenderResult & { store: ReturnType<typeof configureStore> } {
  const { state = {} } = providerValues ?? {};
  const store = configureStore(state);

  // Make this store visible to services that use the global ReduxService
  // so actions dispatched outside React (e.g., Authentication) reach this store.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ReduxService as any).store = store as unknown as never;

  const Wrapper = ({ children }: { children: React.ReactElement }) => (
    <Provider store={store}>
      <ThemeProvider>
        <NavigationProvider>{children}</NavigationProvider>
      </ThemeProvider>
    </Provider>
  );

  const utils = render(<App />, { wrapper: Wrapper });
  return { ...utils, store };
}
