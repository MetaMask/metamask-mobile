import Selectors from "../../wdio/helpers/Selectors"
import { OnboardingSelectorIDs } from '../../e2e/selectors/Onboarding/Onboarding.selectors';
import { OnboardingSheetSelectorIDs } from '../../e2e/selectors/Onboarding/OnboardingSheet.selectors';
import { CommonScreen } from "./CommonScreen";

export class OnboardingScreen extends CommonScreen {

  get createNewWalletButton() {
    return OnboardingSelectorIDs.NEW_WALLET_BUTTON
  }

  get importWalletButton() {
    return SOnboardingSelectorIDs.IMPORT_SEED_BUTTON
  }

  get continueWithSRPButton() {
    return OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON
  }

  async tapOnCreateNewWalletButton() {
    await this.tapOnElement(this.createNewWalletButton);
  }

  async tapOnImportWalletButton() {
    await this.tapOnElement(this.importWalletButton);
  }
  
  async tapOnContinueWithSRPButton() {
    await this.tapOnElement(this.continueWithSRPButton);
  }

}