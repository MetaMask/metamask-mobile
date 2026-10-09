import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaKycSuccess, { VbaKycSuccessSelectorsIDs } from './VbaKycSuccess';

describe('VbaKycSuccess', () => {
  it('renders the verified status and continues', () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = renderWithProvider(
      <VbaKycSuccess onContinue={onContinue} />,
    );

    expect(getByTestId(VbaKycSuccessSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_verified.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_verified.description')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaKycSuccessSelectorsIDs.CONTINUE_BUTTON));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
