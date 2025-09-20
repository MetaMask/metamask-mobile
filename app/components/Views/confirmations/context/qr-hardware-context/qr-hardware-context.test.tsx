import React from 'react';
import { userEvent } from '@testing-library/react-native';

import { ConfirmationFooterSelectorIDs } from '../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { IQRState } from '../../../../UI/QRHardware/types';
import { Footer } from '../../components/footer';
import QRInfo from '../../components/qr-info';
// eslint-disable-next-line import/no-namespace
import * as Camera from './useCamera';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareAwareness from './useQRHardwareAwareness';
import {
  QRHardwareContextProvider,
  useQRHardwareContext,
} from './qr-hardware-context';

jest.mock('../../hooks/transactions/useTransactionConfirm', () => ({
  useTransactionConfirm: jest.fn(() => ({
    onConfirm: jest.fn(),
  })),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getOrAddQRKeyring: jest.fn(),
      cancelQRSignRequest: jest.fn().mockResolvedValue(undefined),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  rejectPendingApproval: jest.fn(),
}));

jest.mock('../../hooks/gas/useGasFeeToken');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
  }),
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
  sync: { reading: false },
};

describe('QRHardwareContext', () => {
  const createCameraSpy = (mockedValues: {
    cameraError: string | undefined;
    hasCameraPermission: boolean;
  }) => {
    jest.spyOn(Camera, 'useCamera').mockReturnValue(mockedValues);
  };

  const createQRHardwareAwarenessSpy = (mockedValues: {
    isQRSigningInProgress: boolean;
    isSigningQRObject: boolean;
    QRState: IQRState;
  }) => {
    jest
      .spyOn(QRHardwareAwareness, 'useQRHardwareAwareness')
      .mockReturnValue(mockedValues);
  };

  it('should pass correct value of needsCameraPermission to child components', () => {
    createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
    createQRHardwareAwarenessSpy({
      isQRSigningInProgress: true,
      isSigningQRObject: true,
      QRState: mockQRState,
    });
    const { getByTestId } = renderWithProvider(
      <QRHardwareContextProvider>
        <Footer />
      </QRHardwareContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON).props.disabled,
    ).toBe(true);
  });

  it('does not invokes KeyringController.cancelQRSignRequest when request is cancelled id QR signing is not in progress', async () => {
    createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
    createQRHardwareAwarenessSpy({
      isQRSigningInProgress: false,
      isSigningQRObject: true,
      QRState: mockQRState,
    });
    const { getByText } = renderWithProvider(
      <QRHardwareContextProvider>
        <Footer />
      </QRHardwareContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    await userEvent.press(getByText('Cancel'));
    expect(
      Engine.context.KeyringController.cancelQRSignRequest,
    ).toHaveBeenCalledTimes(0);
  });

  it('invokes KeyringController.cancelQRSignRequest when request is cancelled', async () => {
    createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
    createQRHardwareAwarenessSpy({
      isQRSigningInProgress: true,
      isSigningQRObject: true,
      QRState: mockQRState,
    });
    const { getByText } = renderWithProvider(
      <QRHardwareContextProvider>
        <Footer />
      </QRHardwareContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    await userEvent.press(getByText('Cancel'));
    expect(
      Engine.context.KeyringController.cancelQRSignRequest,
    ).toHaveBeenCalledTimes(1);
  });

  it('passes correct value of QRState components', () => {
    createCameraSpy({ cameraError: undefined, hasCameraPermission: false });
    createQRHardwareAwarenessSpy({
      isQRSigningInProgress: true,
      isSigningQRObject: true,
      QRState: mockQRState,
    });
    const { getByText } = renderWithProvider(
      <QRHardwareContextProvider>
        <QRInfo />
      </QRHardwareContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(getByText('Scan with your hardware wallet')).toBeTruthy();
  });

  it('passes correct value of scannerVisible to child components', async () => {
    createCameraSpy({ cameraError: undefined, hasCameraPermission: true });
    createQRHardwareAwarenessSpy({
      isQRSigningInProgress: true,
      isSigningQRObject: true,
      QRState: mockQRState,
    });
    const { getByText } = renderWithProvider(
      <QRHardwareContextProvider>
        <>
          <Footer />
          <QRInfo />
        </>
      </QRHardwareContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    await userEvent.press(getByText('Get Signature'));
    expect(
      getByText('Scan your hardware wallet to confirm the transaction'),
    ).toBeTruthy();
  });
});

describe('useQRHardwareContext', () => {
  it('should throw error is not wrapped in QRHardwareContext', () => {
    expect(() => {
      useQRHardwareContext();
    }).toThrow();
  });
});
