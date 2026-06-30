import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { initialStateIdentity } from '../../../../tests/component-view/presets/identity';
import ImportNewSecretRecoveryPhrase from './index';
import { ImportSRPIDs } from './SRPImport.testIds';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';

/**
 * Component View tests for ImportNewSecretRecoveryPhrase (multi-SRP import flow).
 *
 * Mirrors (partial): tests/smoke-appium/accounts/import-srp.spec.ts
 * — screen render, disabled import button, and SRP validation error.
 *
 * Run: yarn jest -c jest.config.view.js ImportNewSecretRecoveryPhrase.view.test.tsx --runInBand
 */

function renderImportNewSRP() {
  const state = initialStateIdentity().build();
  return renderComponentViewScreen(
    ImportNewSecretRecoveryPhrase as unknown as React.ComponentType,
    { name: Routes.MULTI_SRP.IMPORT },
    { state },
  );
}

describeForPlatforms('ImportNewSecretRecoveryPhrase component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // CV-testable: screen renders
  // -----------------------------------------------------------------------

  it('renders the import SRP screen with a disabled import button until words are entered', async () => {
    const { findByTestId, findByText } = renderImportNewSRP();

    expect(await findByTestId(ImportSRPIDs.SCREEN_TITLE_ID)).toBeOnTheScreen();
    expect(
      await findByText(
        strings('import_new_secret_recovery_phrase.import_wallet_title'),
      ),
    ).toBeOnTheScreen();
    expect(await findByTestId(ImportSRPIDs.IMPORT_BUTTON)).toBeDisabled();
  });

  it('shows a validation error when an invalid SRP is submitted', async () => {
    // Twelve valid BIP-39 words with an invalid checksum — passes length check but fails onSubmit validation.
    const invalidSrp = Array(12).fill('abandon').join(' ');

    const { findByTestId, findByText } = renderImportNewSRP();

    fireEvent.changeText(
      await findByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID),
      invalidSrp,
    );

    await waitFor(async () => {
      expect(await findByTestId(ImportSRPIDs.IMPORT_BUTTON)).toBeEnabled();
    });

    fireEvent.press(await findByTestId(ImportSRPIDs.IMPORT_BUTTON));

    expect(
      await findByText(
        strings('import_new_secret_recovery_phrase.error_invalid_srp'),
      ),
    ).toBeOnTheScreen();
  });
});
