import { ConfirmationRowComponentIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../framework/Matchers';

class RowComponents {
  get AccountNetwork(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ACCOUNT_NETWORK);
  }

  get AdvancedDetails(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.ADVANCED_DETAILS,
    );
  }

  get FromTo(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.FROM_TO);
  }

  get GasFeesDetails(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.GAS_FEES_DETAILS,
    );
  }

  get Message(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.MESSAGE);
  }

  get OriginInfo(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ORIGIN_INFO);
  }

  get SimulationDetails(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIMULATION_DETAILS,
    );
  }

  get SiweSigningAccountInfo(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO,
    );
  }

  get TokenHero(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TOKEN_HERO);
  }

  get ApproveRow(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.APPROVE_ROW);
  }
}

export default new RowComponents();
