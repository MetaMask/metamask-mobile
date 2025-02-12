import React from 'react';
import { Button, Text, View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';

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

const MockView = View;
const MockText = Text;
const MockButton = Button;
jest.mock('../../../../../../UI/QRHardware/AnimatedQRScanner', () => ({
  __esModule: true,
  default: ({
    hideModal,
    onScanError,
    onScanSuccess,
  }: {
    hideModal: () => void;
    onScanError: () => void;
    onScanSuccess: ({ cbor }: { cbor: string }) => void;
  }) => (
    <MockView>
      <MockText>Scan your hardware wallet to confirm the transaction</MockText>
      <MockButton onPress={hideModal} title="hideModal" />
      <MockButton onPress={onScanError} title="onScanError" />
      <MockButton
        onPress={() => onScanSuccess({ cbor: 'dummy' })}
        title="onScanSuccess"
      />
    </MockView>
  ),
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
  const createQRHardwareHookSpy = (mockedValues = {}) => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      QRState: mockQRState,
      ...mockedValues,
    } as unknown as QRHardwareHook.QRHardwareContextType);
  };

  it('renders "Scan with your hardware wallet"', () => {
    createQRHardwareHookSpy();
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    expect(getByText('Scan with your hardware wallet')).toBeTruthy();
  });

  it('displays camera error if present', () => {
    createQRHardwareHookSpy({ cameraError: 'some camera error text' });
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    expect(getByText('some camera error text')).toBeTruthy();
  });

  it('contains correct text is scanner is visible', () => {
    createQRHardwareHookSpy({ scannerVisible: true });
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    expect(
      getByText('Scan your hardware wallet to confirm the transaction'),
    ).toBeTruthy();
  });

  it('invoke setScannerVisible when hideModal is called on scanner', () => {
    const mockSetScannerVisible = jest.fn();
    createQRHardwareHookSpy({
      scannerVisible: true,
      setScannerVisible: mockSetScannerVisible,
    });
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    fireEvent.press(getByText('hideModal'));
    expect(mockSetScannerVisible).toHaveBeenCalledTimes(1);
    expect(mockSetScannerVisible).toHaveBeenCalledWith(false);
  });

  it('invoke setScannerVisible when onScanError is called by scanner', () => {
    const mockSetScannerVisible = jest.fn();
    createQRHardwareHookSpy({
      scannerVisible: true,
      setScannerVisible: mockSetScannerVisible,
    });
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    fireEvent.press(getByText('onScanError'));
    expect(mockSetScannerVisible).toHaveBeenCalledTimes(1);
    expect(mockSetScannerVisible).toHaveBeenCalledWith(false);
  });

  it('submits request when onScanSuccess is called by scanner', () => {
    jest.spyOn(ETHSignature, 'fromCBOR').mockReturnValue({
      getRequestId: () => undefined,
    } as unknown as ETHSignature);
    const mockSetScannerVisible = jest.fn();
    createQRHardwareHookSpy({
      scannerVisible: true,
      setScannerVisible: mockSetScannerVisible,
    });
    const { getByText } = renderWithProvider(<QRInfo />, {
      state: typedSignV3ConfirmationState,
    });
    fireEvent.press(getByText('onScanSuccess'));
    expect(mockSetScannerVisible).toHaveBeenCalledTimes(1);
    expect(mockSetScannerVisible).toHaveBeenCalledWith(false);
  });
});
