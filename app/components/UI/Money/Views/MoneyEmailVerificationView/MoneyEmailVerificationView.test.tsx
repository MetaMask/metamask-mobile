import React from 'react';
import { fireEvent, userEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyEmailVerificationView from './MoneyEmailVerificationView';
import { MoneyEmailVerificationViewTestIds } from './MoneyEmailVerificationView.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockReturnToSecurity = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({
    params: mockReturnToSecurity ? { returnToSecurity: true } : undefined,
  }),
}));

describe('MoneyEmailVerificationView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReturnToSecurity = false;
  });

  it('renders the email verification content from the design', () => {
    const { getByText, getByPlaceholderText } = renderWithProvider(
      <MoneyEmailVerificationView />,
    );

    expect(getByText('Verify your email')).toBeOnTheScreen();
    expect(
      getByText(
        'We’ll use your email to verify your account and send you occasional account updates.',
      ),
    ).toBeOnTheScreen();
    expect(getByPlaceholderText('Email address')).toBeOnTheScreen();
    expect(
      getByText(
        'Your email may be shared with MoonPay to provide and operate your account. It won’t be used for marketing.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Continue')).toBeOnTheScreen();
  });

  it('enables Continue after a valid email is entered', () => {
    const { getByTestId } = renderWithProvider(<MoneyEmailVerificationView />);
    const continueButton = getByTestId(
      MoneyEmailVerificationViewTestIds.CONTINUE_BUTTON,
    );

    expect(continueButton).toBeDisabled();

    fireEvent.changeText(
      getByTestId(MoneyEmailVerificationViewTestIds.EMAIL_INPUT),
      'user@example.com',
    );

    expect(continueButton).not.toBeDisabled();
    fireEvent.press(continueButton);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.EMAIL_CODE_VERIFICATION,
      { email: 'user@example.com', returnToSecurity: undefined },
    );
  });

  it('accepts an email typed one character at a time', async () => {
    const { getByTestId } = renderWithProvider(<MoneyEmailVerificationView />);
    const emailInput = getByTestId(
      MoneyEmailVerificationViewTestIds.EMAIL_INPUT,
    );
    const continueButton = getByTestId(
      MoneyEmailVerificationViewTestIds.CONTINUE_BUTTON,
    );

    await userEvent.type(emailInput, 'user@example.com');

    expect(continueButton).not.toBeDisabled();
    await userEvent.press(continueButton);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.EMAIL_CODE_VERIFICATION,
      { email: 'user@example.com', returnToSecurity: undefined },
    );
  });

  it('keeps the Settings return destination', () => {
    mockReturnToSecurity = true;
    const { getByTestId } = renderWithProvider(<MoneyEmailVerificationView />);

    fireEvent.changeText(
      getByTestId(MoneyEmailVerificationViewTestIds.EMAIL_INPUT),
      'user@example.com',
    );
    fireEvent.press(
      getByTestId(MoneyEmailVerificationViewTestIds.CONTINUE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.EMAIL_CODE_VERIFICATION,
      { email: 'user@example.com', returnToSecurity: true },
    );
  });

  it('returns to the previous step from the back button', () => {
    const { getByTestId } = renderWithProvider(<MoneyEmailVerificationView />);

    fireEvent.press(getByTestId(MoneyEmailVerificationViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
