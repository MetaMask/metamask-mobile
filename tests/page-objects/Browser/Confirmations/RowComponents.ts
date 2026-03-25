import { by as detoxBy, element as detoxElement } from 'detox';

import {
  ConfirmationRowComponentIDs,
  GasFeeTokenSelectorIDs,
} from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
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

  /**
   * Resolved recipient name in the From/To row on the confirmation sheet.
   * Use this instead of bare `by.text(domain)` so Android does not match the
   * send-screen recipient field still present under the modal (visibility flake).
   */
  recipientDisplayNameInFromToRow(domain: string): DetoxElement {
    return detoxElement(
      detoxBy
        .text(domain)
        .withAncestor(detoxBy.id(ConfirmationRowComponentIDs.FROM_TO)),
    ) as Detox.IndexableNativeElement;
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

  get NetworkAndOrigin(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.NETWORK);
  }

  get NetworkFeePaidByMetaMask(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.PAID_BY_METAMASK,
    );
  }

  get NetworkFeeGasFeeTokenPill(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRowComponentIDs.GAS_FEE_TOKEN_PILL,
    );
  }

  get NetworkFeeGasFeeTokenSymbol(): DetoxElement {
    return Matchers.getElementByID(
      GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_SYMBOL,
    );
  }

  get NetworkFeeGasFeeTokenArrow(): DetoxElement {
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
