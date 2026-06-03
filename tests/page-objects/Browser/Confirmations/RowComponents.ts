import {
  ConfirmationRowComponentIDs,
  GasFeeTokenSelectorIDs,
} from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';

class RowComponents {
  get AccountNetwork(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.ACCOUNT_NETWORK),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.ACCOUNT_NETWORK,
        ),
    });
  }

  get AdvancedDetails(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.ADVANCED_DETAILS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.ADVANCED_DETAILS,
        ),
    });
  }

  get FromTo(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ConfirmationRowComponentIDs.FROM_TO),
      appium: () =>
        PlaywrightMatchers.getElementById(ConfirmationRowComponentIDs.FROM_TO),
    });
  }

  get GasFeesDetails(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.GAS_FEES_DETAILS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.GAS_FEES_DETAILS,
        ),
    });
  }

  get Message(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ConfirmationRowComponentIDs.MESSAGE),
      appium: () =>
        PlaywrightMatchers.getElementById(ConfirmationRowComponentIDs.MESSAGE),
    });
  }

  get OriginInfo(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.ORIGIN_INFO),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.ORIGIN_INFO,
        ),
    });
  }

  get SimulationDetails(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.SIMULATION_DETAILS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.SIMULATION_DETAILS,
        ),
    });
  }

  get SiweSigningAccountInfo(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO,
        ),
    });
  }

  get TokenHero(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.TOKEN_HERO),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.TOKEN_HERO,
        ),
    });
  }

  get ApproveRow(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.APPROVE_ROW),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.APPROVE_ROW,
        ),
    });
  }

  get NetworkAndOrigin(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ConfirmationRowComponentIDs.NETWORK),
      appium: () =>
        PlaywrightMatchers.getElementById(ConfirmationRowComponentIDs.NETWORK),
    });
  }

  get NetworkFeePaidByMetaMask(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.PAID_BY_METAMASK),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.PAID_BY_METAMASK,
        ),
    });
  }

  get NetworkFeeGasFeeTokenPill(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRowComponentIDs.GAS_FEE_TOKEN_PILL),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRowComponentIDs.GAS_FEE_TOKEN_PILL,
        ),
    });
  }

  get NetworkFeeGasFeeTokenSymbol(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_SYMBOL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_SYMBOL,
        ),
    });
  }

  get NetworkFeeGasFeeTokenArrow(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_ARROW,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          GasFeeTokenSelectorIDs.SELECTED_GAS_FEE_TOKEN_ARROW,
        ),
    });
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
