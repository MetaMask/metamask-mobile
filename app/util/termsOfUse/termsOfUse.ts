import AppConstants from '../../core/AppConstants';
import { MetaMetrics, MetaMetricsEvents } from '../../core/Analytics';
import { TRUE, USE_TERMS } from '../../constants/storage';
import Routes from '../../constants/navigation/Routes';
import { strings } from '../../../locales/i18n';
import { TermsOfUseModalSelectorsIDs } from '../../../e2e/selectors/Modals/TermsOfUseModal.selectors';
import MMKVWrapper from '../../store/mmkv-wrapper';

const onConfirmUseTerms = async () => {
  await MMKVWrapper.setItem(USE_TERMS, TRUE);
  MetaMetrics.getInstance().trackEvent(MetaMetricsEvents.USER_TERMS_ACCEPTED);
};

const useTermsDisplayed = () => {
  MetaMetrics.getInstance().trackEvent(MetaMetricsEvents.USER_TERMS_SHOWN);
};

export default async function navigateTermsOfUse(
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate: (key: string, params: any) => void,
) {
  const isUseTermsAccepted = await MMKVWrapper.getItem(USE_TERMS);
  if (!isUseTermsAccepted) {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.MODAL_MANDATORY,
      params: {
        containerTestId: TermsOfUseModalSelectorsIDs.CONTAINER,
        buttonTestId: TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON,
        buttonText: strings('terms_of_use_modal.accept_cta'),
        checkboxText: strings(
          'terms_of_use_modal.terms_of_use_check_description',
        ),
        headerTitle: strings('terms_of_use_modal.title'),
        onAccept: onConfirmUseTerms,
        footerHelpText: strings('terms_of_use_modal.accept_helper_description'),
        body: {
          source: 'WebView',
          uri: AppConstants.TERMS_OF_USE.TERMS_OF_USE_URL_WITHOUT_COOKIES,
        },
        onRender: useTermsDisplayed,
        isScrollToEndNeeded: true,
        scrollEndBottomMargin: 50,
      },
    });
  }
}
