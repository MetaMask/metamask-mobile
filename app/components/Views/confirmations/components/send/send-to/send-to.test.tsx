import React from 'react';

import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SendContextProvider } from '../../../context/send-context';
import { SendTo } from './send-to';

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <SendTo />
    </SendContextProvider>,
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );

describe('SendTo', () => {
  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('To:')).toBeTruthy();
  });
});
