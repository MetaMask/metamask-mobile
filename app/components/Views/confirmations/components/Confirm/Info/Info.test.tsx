import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../../../context/QRHardwareContext/QRHardwareContext';
import Info from './Info';
import { Text } from 'react-native';

const MockText = Text;
jest.mock('./QRInfo', () => () => <MockText>QR Scanning Component</MockText>);

describe('Info', () => {
  it('renders correctly for personal sign', () => {
    const { getByText } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
  });

  it('renders QRInfo if user is signing using QR hardware', () => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      isSigningQRObject: true,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByText } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('QR Scanning Component')).toBeTruthy();
  });
});
