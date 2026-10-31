import enContent from '../../../locales/languages/en.json';
import {
  SupportConsentSheetSelectorsIDs,
  VbaKycRejectedSelectorsIDs,
  VbaOnboardingLoadingSelectorsIDs,
  VbaOnboardingStubSelectorsIDs,
  VbaSumSubKycSelectorsIDs,
} from '../../selectors/Ramps/VbaKyc.selectors';
import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';

const KYC_REJECTED_COPY = enContent.virtual_bank_account.kyc_rejected;
const SUMSUB_ERROR_TITLE =
  enContent.virtual_bank_account.sumsub_kyc.error_title;
const VBA_STATUS_TIMEOUT_MS = 30_000;

class VbaKycStatusView {
  get rejectedContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(VbaKycRejectedSelectorsIDs.CONTAINER);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(VbaKycRejectedSelectorsIDs.BACK_BUTTON);
  }

  get contactSupportButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON,
    );
  }

  get retryButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(VbaKycRejectedSelectorsIDs.RETRY_BUTTON);
  }

  get sumSubHost(): Promise<AppiumElement> {
    return Matchers.getElementByID(VbaSumSubKycSelectorsIDs.CONTAINER);
  }

  get sumSubError(): Promise<AppiumElement> {
    return Matchers.getElementByID(VbaSumSubKycSelectorsIDs.ERROR);
  }

  get loadingScreen(): Promise<AppiumElement> {
    return Matchers.getElementByID(VbaOnboardingLoadingSelectorsIDs.CONTAINER);
  }

  get onboardingErrorStub(): Promise<AppiumElement> {
    return Matchers.getElementByID(VbaOnboardingStubSelectorsIDs.CONTAINER);
  }

  get supportConsentConfirmButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SupportConsentSheetSelectorsIDs.CONFIRM_BUTTON,
    );
  }

  get supportConsentCloseButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SupportConsentSheetSelectorsIDs.CLOSE_BUTTON,
    );
  }

  async expectTerminalRejectionScreen(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.rejectedContainer, {
      timeout: VBA_STATUS_TIMEOUT_MS,
      description: 'VBA KYC failure screen should be visible',
    });
    await Assertions.expectTextDisplayed(KYC_REJECTED_COPY.title, {
      description: 'VBA KYC failure title should be displayed',
    });
    await Assertions.expectTextDisplayed(KYC_REJECTED_COPY.description, {
      description: 'Rejected copy should end with contact support',
    });
    await Assertions.expectElementToBeVisible(this.contactSupportButton, {
      description: 'Contact support should be the primary action',
    });
    await Assertions.expectElementToNotExist(this.retryButton, {
      description: 'Try again must not be offered for a rejected session',
    });
    await Assertions.expectTextNotDisplayed(SUMSUB_ERROR_TITLE, {
      description: "Couldn't start verification must not be displayed",
    });
    await Assertions.expectElementToNotExist(this.onboardingErrorStub, {
      description: 'VBA onboarding error stub must not be displayed',
    });
  }

  async expectRetryScreen(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.rejectedContainer, {
      timeout: VBA_STATUS_TIMEOUT_MS,
      description: 'VBA KYC failure screen should be visible for retry',
    });
    await Assertions.expectTextDisplayed(KYC_REJECTED_COPY.retry_description, {
      description: 'Retry copy should end with try again',
    });
    await Assertions.expectElementToBeVisible(this.retryButton, {
      description: 'Try again should be the primary action for retry',
    });
    await Assertions.expectElementToNotExist(this.contactSupportButton, {
      description: 'Contact support must not replace Try again for retry',
    });
  }

  async expectSumSubHostLaunching(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.sumSubHost, {
      timeout: VBA_STATUS_TIMEOUT_MS,
      description: 'SumSub host screen should open after Try again',
    });
    await Assertions.expectElementToNotExist(this.sumSubError, {
      description: "SumSub host should not show Couldn't start verification",
    });
    await Assertions.expectElementToNotExist(this.rejectedContainer, {
      timeout: VBA_STATUS_TIMEOUT_MS,
      description: 'VBA KYC failure screen must not reopen after Try again',
    });
  }

  async expectSupportConsentVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.supportConsentConfirmButton,
      {
        timeout: VBA_STATUS_TIMEOUT_MS,
        description: 'Support consent sheet should open from Contact support',
      },
    );
  }

  async tapContactSupport(): Promise<void> {
    await Gestures.waitAndTap(this.contactSupportButton, {
      elemDescription: 'VBA KYC failure - Contact support button',
    });
  }

  async tapRetry(): Promise<void> {
    await Gestures.waitAndTap(this.retryButton, {
      elemDescription: 'VBA KYC failure - Try again button',
    });
  }

  async tapBack(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'VBA KYC failure - back button',
    });
  }

  async dismissSupportConsent(): Promise<void> {
    await Gestures.waitAndTap(this.supportConsentCloseButton, {
      elemDescription: 'Support consent sheet - close button',
    });
  }
}

export default new VbaKycStatusView();
