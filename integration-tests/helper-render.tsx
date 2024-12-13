import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ConnectedRoot} from '../app/components/Views/Root/ConnectedRoot';
import { createStoreAndPersistor } from '../app/store';
import { RootState } from '../app/reducers';

export async function renderIntegrationTest({
  preloadedState,
  renderOptions
}: {
  preloadedState: RootState,
  renderOptions: RenderOptions
}) {
  try {
    const { store, persistor } = await createStoreAndPersistor(preloadedState);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      ...render(
        <ConnectedRoot store={store} persistor={persistor} />,
        { ...renderOptions },
      )
    };
  } catch (error) {
    console.error('error', error);
    throw error;
  }
}
