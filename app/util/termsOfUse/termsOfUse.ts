import AsyncStorage from '@react-native-async-storage/async-storage';
import AppConstants from '../../core/AppConstants';
import { MetaMetricsEvents } from '../../core/Analytics';
import { trackEventV2 as trackEvent } from '../analyticsV2';
import { TRUE, USE_TERMS } from '../../constants/storage';
import Routes from '../../constants/navigation/Routes';
import { strings } from '../../../locales/i18n';
import {
  TERMS_OF_USE_ACCEPT_BUTTON_ID,
  TERMS_OF_USE_SCREEN_ID,
} from '../../../wdio/screen-objects/testIDs/Components/TermsOfUse.testIds';

const onConfirmUseTerms = async () => {
  await AsyncStorage.setItem(USE_TERMS, TRUE);
  trackEvent(MetaMetricsEvents.USER_TERMS_ACCEPTED, {});
};

const useTermsDisplayed = () => {
  trackEvent(MetaMetricsEvents.USER_TERMS_SHOWN, {});
};

export default async function navigateTermsOfUse(
  navigate: (key: string, params: any) => void,
) {
  const isUseTermsAccepted = await AsyncStorage.getItem(USE_TERMS);
  if (!isUseTermsAccepted) {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.MODAL_MANDATORY,
      params: {
        containerTestId: TERMS_OF_USE_SCREEN_ID,
        buttonTestId: TERMS_OF_USE_ACCEPT_BUTTON_ID,
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
