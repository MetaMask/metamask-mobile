import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  siweSignatureConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
import PersonalSign from './PersonalSign';

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

describe('PersonalSign', () => {
  it('should render correctly', async () => {
    const { getByText } = renderWithProvider(<PersonalSign />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
  });

  it('should render tos statement for SIWE', async () => {
    const { getByText, getAllByText } = renderWithProvider(<PersonalSign />, {
      state: siweSignatureConfirmationState,
    });
    expect(getByText('Message')).toBeDefined();
    expect(
      getByText(
        'I accept the MetaMask Terms of Service: https://community.metamask.io/tos',
      ),
    ).toBeDefined();
    fireEvent.press(getByText('Message'));
    expect(getAllByText('Message')).toHaveLength(2);
    expect(
      getAllByText(
        'I accept the MetaMask Terms of Service: https://community.metamask.io/tos',
      ),
    ).toHaveLength(2);
    expect(getByText('URL')).toBeDefined();
    expect(getAllByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('https://metamask.github.io')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getAllByText('Ethereum Mainnet')).toHaveLength(2);
    expect(getByText('Account')).toBeDefined();
    expect(getAllByText('0x8Eeee...73D12')).toBeDefined();
    expect(getByText('Version')).toBeDefined();
    expect(getAllByText('1')).toHaveLength(2);
    expect(getByText('Chain ID')).toBeDefined();
    expect(getByText('Nonce')).toBeDefined();
    expect(getByText('32891757')).toBeDefined();
    expect(getByText('Issued')).toBeDefined();
    expect(getByText('30 September 2021, 16:25')).toBeDefined();
    expect(getByText('Request ID')).toBeDefined();
    expect(getByText('12345')).toBeDefined();
    expect(getByText('Resources')).toBeDefined();
    expect(getByText('resource-1')).toBeDefined();
    expect(getByText('resource-2')).toBeDefined();
    expect(getByText('resource-3')).toBeDefined();
  });
});
