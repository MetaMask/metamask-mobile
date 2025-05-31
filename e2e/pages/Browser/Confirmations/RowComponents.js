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
}

export default new RowComponents();
