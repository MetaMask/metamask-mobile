import React from 'react';

import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SendContextProvider } from '../../../context/send-context';
import To from './to';

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <To />
    </SendContextProvider>,
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );

describe('To', () => {
  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('To:')).toBeTruthy();
  });
});
