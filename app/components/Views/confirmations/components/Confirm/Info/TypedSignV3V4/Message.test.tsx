import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { typedSignV4ConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as SignatureRequestHook from '../../../../hooks/useSignatureRequest';
import Message from './Message';

jest.mock('../../../../hooks/useTokenDecimalsInTypedSignRequest', () => ({
  useTokenDecimalsInTypedSignRequest: () => 2,
}));

describe('Message', () => {
  it('render correctly for V4 permit', async () => {
    const { getAllByText, getByText } = renderWithProvider(<Message />, {
      state: typedSignV4ConfirmationState,
    });
    expect(getAllByText('Message')).toHaveLength(1);
    fireEvent.press(getByText('Message'));
    expect(getAllByText('Message')).toHaveLength(3);
    expect(getByText('Primary type')).toBeDefined();
    expect(getByText('Permit')).toBeDefined();
    expect(getByText('Owner')).toBeDefined();
    expect(getByText('0x935E7...05477')).toBeDefined();
    expect(getByText('Spender')).toBeDefined();
    expect(getByText('0x5B38D...eddC4')).toBeDefined();
    expect(getByText('Value')).toBeDefined();
    expect(getByText('30')).toBeDefined();
    expect(getByText('Nonce')).toBeDefined();
    expect(getByText('0')).toBeDefined();
    expect(getByText('Deadline')).toBeDefined();
    expect(getByText('09 June 3554, 16:53')).toBeDefined();
  });

  it('render null if signature request is not found', async () => {
    jest
      .spyOn(SignatureRequestHook, 'useSignatureRequest')
      .mockReturnValue(undefined);
    const { queryByText } = renderWithProvider(<Message />, {
      state: typedSignV4ConfirmationState,
    });
    expect(queryByText('Message')).toBeNull();
  });
});
