import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MockKycEmail from './MockKycEmail';
import { MockKycEmailSelectorsIDs } from './MockKycEmail.testIds';
import { startIronKycVerification } from './ironKycFlow';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('./ironKycFlow');

const mockStartIronKycVerification = jest.mocked(startIronKycVerification);

describe('MockKycEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartIronKycVerification.mockResolvedValue(undefined);
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MockKycEmail />);

    fireEvent.press(getByTestId(MockKycEmailSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('starts Iron verification with the entered email and navigates on success', async () => {
    const { getByTestId } = renderWithProvider(<MockKycEmail />);

    fireEvent.changeText(
      getByTestId(MockKycEmailSelectorsIDs.EMAIL_INPUT),
      '  user@example.com  ',
    );
    fireEvent.press(getByTestId(MockKycEmailSelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(mockStartIronKycVerification).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(mockNavigate).toHaveBeenCalledWith('RampVbaMockKycSuccess');
    });
  });

  it('does nothing when the email is empty', () => {
    const { getByTestId } = renderWithProvider(<MockKycEmail />);

    fireEvent.changeText(getByTestId(MockKycEmailSelectorsIDs.EMAIL_INPUT), '');
    fireEvent.press(getByTestId(MockKycEmailSelectorsIDs.CONTINUE_BUTTON));

    expect(mockStartIronKycVerification).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('alerts and stays put when Iron verification fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockStartIronKycVerification.mockRejectedValue(
      new Error('Iron session failed: consents.'),
    );
    const { getByTestId } = renderWithProvider(<MockKycEmail />);

    fireEvent.press(getByTestId(MockKycEmailSelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Identity verification',
        'Iron session failed: consents.',
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
