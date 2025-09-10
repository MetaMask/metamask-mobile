import { MetaMetrics, MetaMetricsEvents } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import { TRUE, USE_TERMS } from '../../constants/storage';
import Routes from '../../constants/navigation/Routes';
import { strings } from '../../../locales/i18n';
import { TermsOfUseModalSelectorsIDs } from '../../../e2e/selectors/Onboarding/TermsOfUseModal.selectors';
import StorageWrapper from '../../store/storage-wrapper';
import termsOfUse from './termsOfUseContent';
import type { MandatoryModalParams } from '../../component-library/components/Modals/ModalMandatory/ModalMandatory.types';

const onConfirmUseTerms = async (onAccept?: () => void) => {
  await StorageWrapper.setItem(USE_TERMS, TRUE);
  if (onAccept) {
    onAccept();
  }
  MetaMetrics.getInstance().trackEvent(
    MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.USER_TERMS_ACCEPTED,
    ).build(),
  );
};

const useTermsDisplayed = () => {
  MetaMetrics.getInstance().trackEvent(
    MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.USER_TERMS_SHOWN,
    ).build(),
  );
};

export default async function navigateTermsOfUse(
  navigate: (key: string, params: MandatoryModalParams) => void,
  onAccept?: () => void,
) {
  const isUseTermsAccepted = await StorageWrapper.getItem(USE_TERMS);
  if (!isUseTermsAccepted) {
    navigate(Routes.MODAL.MODAL_MANDATORY, {
      containerTestId: TermsOfUseModalSelectorsIDs.CONTAINER,
      buttonTestId: TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON,
      buttonText: strings('terms_of_use_modal.agree_cta'),
      checkboxText: strings(
        'terms_of_use_modal.terms_of_use_check_description',
      ),
      headerTitle: strings('terms_of_use_modal.title'),
      onAccept: () => onConfirmUseTerms(onAccept),
      footerHelpText: strings('terms_of_use_modal.accept_helper_description'),
      body: {
        source: 'WebView',
        html: termsOfUse,
      },
      onRender: useTermsDisplayed,
      isScrollToEndNeeded: true,
      scrollEndBottomMargin: 50,
    });
  }
}
