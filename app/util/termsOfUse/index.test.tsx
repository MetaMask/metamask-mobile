import { MetaMetricsEvents } from '../../core/Analytics';
import { AnalyticsEventBuilder } from '../analytics/AnalyticsEventBuilder';
import { analytics } from '../analytics/analytics';
import { TRUE, USE_TERMS } from '../../constants/storage';
import Routes from '../../constants/navigation/Routes';
import { strings } from '../../../locales/i18n';
import { TermsOfUseModalSelectorsIDs } from './TermsOfUseModal.testIds';
import StorageWrapper from '../../store/storage-wrapper';
import navigateTermsOfUse from './termsOfUse';
import termsOfUse from './termsOfUseContent';

jest.mock('../analytics/analytics');
jest.mock('../../store/storage-wrapper');
jest.mock('../../../locales/i18n');

describe('Terms of Use', () => {
  const mockNavigate = jest.fn();
  const mockOnAccept = jest.fn();
  const mockGetItem = jest.fn();
  const mockSetItem = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (StorageWrapper.getItem as jest.Mock) = mockGetItem;
    (StorageWrapper.setItem as jest.Mock) = mockSetItem;
    (strings as jest.Mock).mockImplementation((key) => key);
  });

  describe('navigateTermsOfUse', () => {
    it('should navigate to terms of use modal when terms are not accepted', async () => {
      mockGetItem.mockResolvedValue(null);

      await navigateTermsOfUse(mockNavigate, mockOnAccept);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.MODAL_MANDATORY,
        params: {
          containerTestId: TermsOfUseModalSelectorsIDs.CONTAINER,
          buttonTestId: TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON,
          buttonText: 'terms_of_use_modal.agree_cta',
          checkboxText: 'terms_of_use_modal.terms_of_use_check_description',
          headerTitle: 'terms_of_use_modal.title',
          onAccept: expect.any(Function),
          footerHelpText: 'terms_of_use_modal.accept_helper_description',
          body: {
            source: 'WebView',
            html: termsOfUse,
          },
          onRender: expect.any(Function),
          isScrollToEndNeeded: true,
          scrollEndBottomMargin: 50,
        },
      });
    });

    it('should not navigate when terms are already accepted', async () => {
      mockGetItem.mockResolvedValue(TRUE);

      await navigateTermsOfUse(mockNavigate, mockOnAccept);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('onConfirmUseTerms', () => {
    it('should store terms acceptance and call onAccept callback', async () => {
      mockGetItem.mockResolvedValue(null);
      await navigateTermsOfUse(mockNavigate, mockOnAccept);

      const { onAccept } = mockNavigate.mock.calls[0][1].params;
      await onAccept();

      expect(mockSetItem).toHaveBeenCalledWith(USE_TERMS, TRUE);
      expect(mockOnAccept).toHaveBeenCalled();
      expect(jest.mocked(analytics.trackEvent)).toHaveBeenCalledWith(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.USER_TERMS_ACCEPTED,
        ).build(),
      );
    });

    it('should track terms acceptance even without onAccept callback', async () => {
      mockGetItem.mockResolvedValue(null);
      await navigateTermsOfUse(mockNavigate);

      const { onAccept } = mockNavigate.mock.calls[0][1].params;
      await onAccept();

      expect(mockSetItem).toHaveBeenCalledWith(USE_TERMS, TRUE);
      expect(jest.mocked(analytics.trackEvent)).toHaveBeenCalledWith(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.USER_TERMS_ACCEPTED,
        ).build(),
      );
    });
  });

  describe('useTermsDisplayed', () => {
    it('should track terms display event', async () => {
      mockGetItem.mockResolvedValue(null);
      await navigateTermsOfUse(mockNavigate);

      const { onRender } = mockNavigate.mock.calls[0][1].params;
      onRender();

      expect(jest.mocked(analytics.trackEvent)).toHaveBeenCalledWith(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.USER_TERMS_SHOWN,
        ).build(),
      );
    });
  });
});
