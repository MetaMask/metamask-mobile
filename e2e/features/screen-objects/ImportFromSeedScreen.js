import {
  IMPORT_FROM_SEED_SCREEN_TITLE_ID,
  IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID
} from '../../../app/constants/testIDs/Screens/ImportFromSeedScreen.testIds';

// (//XCUIElementTypeOther[@name="New Password"])[3]/XCUIElementTypeOther[2]

class ImportFromSeed {
  async verifyScreenTitle() {
    await expect(await $(`~${IMPORT_FROM_SEED_SCREEN_TITLE_ID}`)).toBeDisplayed();
  }

  async typeSecretRecoveryPhrase() {
    const elem = await $(`~${IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID}`)
    await expect(elem).toBeDisplayed();
    await elem.setValue(
      IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
    );
    await driver.hideKeyboard('pressKey', 'next');
    await driver.pause(2000);
  }

  async typeNewPassword() {
    const elem = await $(`~${IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID}`)
    await expect(elem).toBeDisplayed();
    await elem.setValue(
      IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
    );
  }

  async typeConfirmPassword() {
    const elem = await $(`~${IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID}`)
    await expect(elem).toBeDisplayed();
    await elem.setValue(
      IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID,
    );
  }
}

export default new ImportFromSeed();


// <OutlinedTextField
//   style={styles.input}
//   containerStyle={inputWidth}
//   {...generateTestId(
//     Platform,
//     IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
//   )}
//   placeholder={strings('import_from_seed.new_password')}
//   placeholderTextColor={colors.text.muted}
//   returnKeyType={'next'}
//   autoCapitalize="none"
//   secureTextEntry={secureTextEntry}
//   onChangeText={this.onPasswordChange}
//   value={password}
//   baseColor={colors.border.default}
//   tintColor={colors.primary.default}
//   onSubmitEditing={this.jumpToConfirmPassword}
//   keyboardAppearance={themeAppearance}
// />
