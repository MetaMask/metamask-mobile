import {
  ConfirmationRowComponentIDs,
  GasFeeTokenSelectorIDs,
} from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import { EncapsulatedElementType } from '../../../framework';

class RowComponents {
  get AccountNetwork(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ACCOUNT_NETWORK);
  }

  get AdvancedDetails(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.ADVANCED_DETAILS,
    );
  }

  get FromTo(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.FROM_TO);
  }

  get GasFeesDetails(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.GAS_FEES_DETAILS,
    );
  }

  get Message(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.MESSAGE);
  }

  get OriginInfo(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.ORIGIN_INFO);
  }

  get SimulationDetails(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIMULATION_DETAILS,
    );
  }

  get SiweSigningAccountInfo(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO,
    );
  }

  get TokenHero(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TOKEN_HERO);
  }

  get ApproveRow(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.APPROVE_ROW);
  }

  get NetworkAndOrigin(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.NETWORK);
  }

  get NetworkFeePaidByMetaMask(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.PAID_BY_METAMASK,
    );
  }

  get NetworkFeeGasFeeTokenPill(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.GAS_FEE_TOKEN_PILL,
    );
  }

  get NetworkFeeGasFeeTokenSymbol(): EncapsulatedElementType {
    return Matchers.getElementByID(
      GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_SYMBOL,
    );
  }

  get NetworkFeeGasFeeTokenArrow(): EncapsulatedElementType {
    return Matchers.getElementByID(
      GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_ARROW,
    );
  }

  async getNetworkFeeGasFeeTokenSymbolText(): Promise<string> {
    const symbolElement = (await this
      .NetworkFeeGasFeeTokenSymbol) as IndexableNativeElement;
    const symbolElementAttributes = await symbolElement.getAttributes();
    return (
      (symbolElementAttributes as { text?: string; label?: string })?.text ??
      (symbolElementAttributes as { text?: string; label?: string })?.label ??
      ''
    );
  }
}

export default new RowComponents();
