import React from 'react';
import { render } from '@testing-library/react';
import { ConnectedRoot } from '../app/components/Views/Root/ConnectedRoot';
import { createStoreAndPersistor } from '../app/store';

export async function renderIntegrationTest({ preloadedState, ...renderOptions }) {
  const { store, persistor } = await createStoreAndPersistor(preloadedState).catch(console.error);

  return renderWithRedux({ store, persistor, renderOptions});
}

function renderWithRedux({ store, persistor, renderOptions }) {
  return render(
    <ConnectedRoot store={store} persistor={persistor} />,
    renderOptions,
  );
}
