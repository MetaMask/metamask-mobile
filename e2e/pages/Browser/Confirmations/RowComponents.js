import { ConfirmationRowComponentIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../utils/Matchers';

class RowComponents {
  get AdvancedDetails() {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.ADVANCED_DETAILS,
    );
  }

  get FromTo() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.FROM_TO);
  }

  get GasFeesDetails() {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.GAS_FEES_DETAILS,
    );
  }

  get TokenHero() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TOKEN_HERO);
  }

  get SimulationDetails() {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIMULATION_DETAILS,
    );
  }

  // Signature specific rows
  get OriginInfoSection() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ORIGIN_INFO);
  }

  get SiweSigningAccountInfoSection() {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO,
    );
  }

  get MessageSection() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.MESSAGE);
  }

  get AccountNetwork() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ACCOUNT_NETWORK);
  }
}

export default new RowComponents();
