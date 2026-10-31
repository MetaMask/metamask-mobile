import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaIdentityVerified, {
  VbaIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';

const renderScreen = () => {
  const onBack = jest.fn();
  const onContinue = jest.fn();
  const screen = renderWithProvider(
    <VbaIdentityVerified onBack={onBack} onContinue={onContinue} />,
  );
  return { ...screen, onBack, onContinue };
};

describe('VbaIdentityVerified', () => {
  it('renders the identity verified title and description', () => {
    const { getByText } = renderScreen();

    expect(
      getByText(strings('virtual_bank_account.identity_verified.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.identity_verified.description')),
    ).toBeOnTheScreen();
  });

  it('calls onContinue from Continue', () => {
    const { getByTestId, onContinue, onBack } = renderScreen();

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('calls onBack from Back', () => {
    const { getByTestId, onBack, onContinue } = renderScreen();

    fireEvent.press(getByTestId(VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
