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
const mockResetKyc = jest.fn();

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
      resetKyc: mockResetKyc,
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
      resetKyc: mockResetKyc,
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

  it('resets KYC when the reset button is pressed', () => {
    const { getByTestId } = renderWithProvider(<KycEmail />);

    fireEvent.press(getByTestId(KycEmailSelectorsIDs.RESET_BUTTON));

    expect(mockResetKyc).toHaveBeenCalled();
  });

  it('shows the current KycController email, vendor, geoCountry, and sessionStatus', () => {
    const sessionStatus = {
      id: 'session-1',
      finalStatus: 'new',
    };

    const { getByText } = renderWithProvider(<KycEmail />, {
      state: {
        engine: {
          backgroundState: {
            KycController: {
              email: 'user@example.com',
              vendor: 'iron',
              geoCountry: 'BRA',
              sessionStatus,
            },
          },
        },
      },
    });

    expect(getByText('email: user@example.com')).toBeOnTheScreen();
    expect(getByText('vendor: iron')).toBeOnTheScreen();
    expect(getByText('geoCountry: BRA')).toBeOnTheScreen();
    expect(
      getByText(`sessionStatus: ${JSON.stringify(sessionStatus)}`),
    ).toBeOnTheScreen();
  });
});
