import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as ToAddressValidationUtils from '../../../hooks/send/useToAddressValidation';
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

  it('display error and warning if present', async () => {
    jest
      .spyOn(ToAddressValidationUtils, 'useToAddressValidation')
      .mockReturnValue({
        toAddressError: 'Error in recipient address',
        toAddressWarning: 'Warning in recipient address',
      });

    const { getByText } = renderComponent();
    expect(getByText('Error in recipient address')).toBeTruthy();
    expect(getByText('Warning in recipient address')).toBeTruthy();
  });
});
