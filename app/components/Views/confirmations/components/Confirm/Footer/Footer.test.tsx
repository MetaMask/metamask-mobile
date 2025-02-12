import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { ConfirmationFooterSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../../../context/QRHardwareContext/QRHardwareContext';
import Footer from './index';

const mockConfirmSpy = jest.fn();
const mockRejectSpy = jest.fn();
jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: () => ({
    onConfirm: mockConfirmSpy,
    onReject: mockRejectSpy,
  }),
}));

describe('Footer', () => {
  it('should render correctly', () => {
    const { getByText, getAllByRole } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Reject')).toBeDefined();
    expect(getByText('Confirm')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('Confirm'));
    expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
  });

  it('should call onReject when reject button is clicked', () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('Reject'));
    expect(mockRejectSpy).toHaveBeenCalledTimes(1);
  });

  it('renders confirm button text "Get Signature" if QR signing is in progress', () => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      isQRSigningInProgress: true,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Get Signature')).toBeTruthy();
  });

  it('confirm button is disabled if `needsCameraPermission` is true', () => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      needsCameraPermission: true,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByTestId } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON).props.disabled,
    ).toBe(true);
  });
});
