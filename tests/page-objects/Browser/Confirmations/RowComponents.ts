import {
  ConfirmationRowComponentIDs,
  GasFeeTokenSelectorIDs,
} from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import { type AppiumElement, Utilities } from '../../../framework';

class RowComponents {
  get AccountNetwork(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ACCOUNT_NETWORK);
  }

  get AdvancedDetails(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.ADVANCED_DETAILS,
    );
  }

  get FromTo(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.FROM_TO);
  }

  get GasFeesDetails(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.GAS_FEES_DETAILS,
    );
  }

  get Message(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.MESSAGE);
  }

  get OriginInfo(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ORIGIN_INFO);
  }

  get SimulationDetails(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIMULATION_DETAILS,
    );
  }

  get SiweSigningAccountInfo(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO,
    );
  }

  get TokenHero(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TOKEN_HERO);
  }

  get ApproveRow(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.APPROVE_ROW);
  }

  get NetworkAndOrigin(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.NETWORK);
  }

  get NetworkFeePaidByMetaMask(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.PAID_BY_METAMASK,
    );
  }

  get NetworkFeeGasFeeTokenPill(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.GAS_FEE_TOKEN_PILL,
    );
  }

  get NetworkFeeGasFeeTokenSymbol(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_SYMBOL,
    );
  }

  get NetworkFeeGasFeeTokenArrow(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_ARROW,
    );
  }

  async getNetworkFeeGasFeeTokenSymbolText(): Promise<string> {
    return Utilities.getElementText(this.NetworkFeeGasFeeTokenSymbol);
  }
}

export default new RowComponents();
