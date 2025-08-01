import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SendContextProvider } from '../../../context/send-context';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { SendTo } from './send-to';

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <SendTo />
    </SendContextProvider>,
    {
      state: evmSendStateMock,
    },
  );

describe('SendTo', () => {
  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('To:')).toBeTruthy();
  });
});
