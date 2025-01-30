import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { typedSignV3ConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../../../../context/QRHardwareContext/QRHardwareContext';
import QRInfo from './QRInfo';

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      submitQRSignature: jest.fn(),
    },
  },
}));

const mockQRState = {
  sign: {
    request: {
      requestId: 'c95ecc76-d6e9-4a0a-afa3-31429bc80566',
      payload: {
        type: 'eth-sign-request',
        cbor: 'a501d82550c95ecc76d6e94a0aafa331429bc8056602581f4578616d706c652060706572736f6e616c5f7369676e60206d657373616765030305d90130a2018a182cf5183cf500f500f400f4021a73eadf6d0654126f6e36f2fbc44016d788c91b82ab4c50f74e17',
      },
      title: 'Scan with your Keystone',
      description:
        'After your Keystone has signed this message, click on "Scan Keystone" to receive the signature',
    },
  },
};

describe('QRInfo', () => {
  it('should contained required text', () => {
    jest
      .spyOn(QRHardwareHook, 'useQRHardwareContext')
      .mockReturnValue({
        QRState: mockQRState,
      } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    expect(getByText('Scan with your hardware wallet')).toBeDefined();
  });

  it('should contain correct text is scanner is visible', () => {
    jest
      .spyOn(QRHardwareHook, 'useQRHardwareContext')
      .mockReturnValue({
        scannerVisible: true,
      } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    expect(
      getByText('Scan your hardware wallet to confirm the transaction'),
    ).toBeDefined();
  });
});
