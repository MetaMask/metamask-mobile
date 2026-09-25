import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycEmail, { KycEmailSelectorsIDs } from './KycEmail';
import { useKycEmailVerification } from './hooks/useKycEmailVerification';

jest.mock('./hooks/useKycEmailVerification');

const mockUseKycEmailVerification = jest.mocked(useKycEmailVerification);
const mockSetEmail = jest.fn();
const mockGoBack = jest.fn();
const mockStartVerification = jest.fn();

describe('KycEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycEmailVerification.mockReturnValue({
      email: '',
      setEmail: mockSetEmail,
      isVerifying: false,
      isContinueDisabled: true,
      goBack: mockGoBack,
      startVerification: mockStartVerification,
    });
  });

  it('disables continue until the hook enables it', () => {
    const { getByTestId } = renderWithProvider(<KycEmail />);

    expect(getByTestId(KycEmailSelectorsIDs.CONTINUE_BUTTON)).toBeDisabled();
  });

  it('passes typed email into the hook', () => {
    const { getByTestId } = renderWithProvider(<KycEmail />);

    fireEvent.changeText(
      getByTestId(KycEmailSelectorsIDs.EMAIL_INPUT),
      'user@example.com',
    );

    expect(mockSetEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('starts verification when continue is pressed', () => {
    mockUseKycEmailVerification.mockReturnValue({
      email: 'user@example.com',
      setEmail: mockSetEmail,
      isVerifying: false,
      isContinueDisabled: false,
      goBack: mockGoBack,
      startVerification: mockStartVerification,
    });
    const { getByTestId } = renderWithProvider(<KycEmail />);

    fireEvent.press(getByTestId(KycEmailSelectorsIDs.CONTINUE_BUTTON));

    expect(mockStartVerification).toHaveBeenCalled();
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(<KycEmail />);

    fireEvent.press(getByTestId(KycEmailSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
