import { ConfirmationRowComponentIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../utils/Matchers';

class RowComponents {
  get AccountNetwork() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ACCOUNT_NETWORK);
  }

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

  get Message() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.MESSAGE);
  }

  get OriginInfo() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ORIGIN_INFO);
  }

  get SimulationDetails() {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIMULATION_DETAILS,
    );
  }

  get SiweSigningAccountInfo() {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO,
    );
  }

  get TokenHero() {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TOKEN_HERO);
  }
}

export default new RowComponents();
