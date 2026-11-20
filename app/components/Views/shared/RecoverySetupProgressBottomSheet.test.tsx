import React from 'react';
import { Modal } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import RecoverySetupProgressBottomSheet, {
  RECOVERY_SETUP_PROGRESS_TEST_IDS,
} from './RecoverySetupProgressBottomSheet';

describe('RecoverySetupProgressBottomSheet', () => {
  it('renders the sheet with a spinner, title and description', () => {
    render(<RecoverySetupProgressBottomSheet />);

    expect(
      screen.getByTestId(RECOVERY_SETUP_PROGRESS_TEST_IDS.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(RECOVERY_SETUP_PROGRESS_TEST_IDS.SPINNER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('mfa.settings.recovery_setup_in_progress_title'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('mfa.settings.recovery_setup_in_progress_description'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the given title instead of the setup title', () => {
    render(<RecoverySetupProgressBottomSheet title="Updating recovery" />);

    expect(screen.getByText('Updating recovery')).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('mfa.settings.recovery_setup_in_progress_title'),
      ),
    ).toBeNull();
  });

  it('renders no close button', () => {
    render(<RecoverySetupProgressBottomSheet />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('keeps the sheet rendered when Android back requests a close', () => {
    render(<RecoverySetupProgressBottomSheet />);
    const { onRequestClose } = screen.UNSAFE_getByType(Modal).props;

    expect(() => onRequestClose()).not.toThrow();

    expect(
      screen.getByTestId(RECOVERY_SETUP_PROGRESS_TEST_IDS.SHEET),
    ).toBeOnTheScreen();
  });
});
