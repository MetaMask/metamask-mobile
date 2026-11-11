import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycIdentityVerified, {
  KycIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');

describe('KycIdentityVerified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the verified copy', () => {
    const onExit = jest.fn();
    const onContinue = jest.fn();
    const { getByText } = renderWithProvider(
      <KycIdentityVerified onExit={onExit} onContinue={onContinue} />,
    );

    expect(getByText(strings('kyc.identity_verified.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.identity_verified.description')),
    ).toBeOnTheScreen();
    expect(onContinue).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('hands Continue to the caller', () => {
    const onExit = jest.fn();
    const onContinue = jest.fn();
    const { getByTestId } = renderWithProvider(
      <KycIdentityVerified onExit={onExit} onContinue={onContinue} />,
    );

    fireEvent.press(
      getByTestId(KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('hands Back to the caller', () => {
    const onExit = jest.fn();
    const onContinue = jest.fn();
    const { getByTestId } = renderWithProvider(
      <KycIdentityVerified onExit={onExit} onContinue={onContinue} />,
    );

    fireEvent.press(getByTestId(KycIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('reports the approved result as viewed', () => {
    renderWithProvider(
      <KycIdentityVerified onExit={jest.fn()} onContinue={jest.fn()} />,
    );

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('approved');
  });
});
