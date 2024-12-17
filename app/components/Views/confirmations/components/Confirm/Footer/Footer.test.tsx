import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import Footer from './index';
import { fireEvent } from '@testing-library/react-native';

const mockConfirmSpy = jest.fn();
const mockRejectSpy = jest.fn();
jest.mock('../../../hooks/useApprovalRequest', () => () => ({
  onConfirm: mockConfirmSpy,
  onReject: mockRejectSpy,
}));

describe('Footer', () => {
  it('should match snapshot for personal sign', async () => {
    const container = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('Confirm'));
    expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
  });

  it('should call onReject when reject button is clicked', async () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('Reject'));
    expect(mockRejectSpy).toHaveBeenCalledTimes(1);
  });
});
