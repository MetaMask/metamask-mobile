import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import PerpsServiceInterruptionBanner, {
  buildDescriptionSegments,
  SERVICE_INTERRUPTION_BANNER_COLLAPSE_SCROLL_PX,
  SERVICE_INTERRUPTION_BANNER_EXPAND_SCROLL_PX,
} from './PerpsServiceInterruptionBanner';
import { selectPerpsServiceInterruptionBannerEnabledFlag } from '../../selectors/featureFlags';
import {
  SERVICE_INTERRUPTION_CONFIG,
  SUPPORT_CONFIG,
} from '../../constants/perpsConfig';
import { strings } from '../../../../../../locales/i18n';

const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 0, left: 0 }),
}));

const mockOpenSupportWithConsent = jest.fn();
jest.mock('../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

const { useSelector } = jest.requireMock('react-redux');

const TEST_ID = 'perps-service-interruption-banner';

// The collapsed description is hidden from accessibility, which RNTL also
// excludes from default queries.
const getDescription = (
  getByTestId: ReturnType<typeof render>['getByTestId'],
) => getByTestId(`${TEST_ID}-description`, { includeHiddenElements: true });

const mockBannerFlag = (isEnabled: boolean) => {
  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsServiceInterruptionBannerEnabledFlag) {
      return isEnabled;
    }
    return undefined;
  });
};

describe('PerpsServiceInterruptionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBannerFlag(true);
  });

  it('renders nothing when flag is disabled', () => {
    mockBannerFlag(false);

    const { queryByTestId } = render(<PerpsServiceInterruptionBanner />);

    expect(queryByTestId(TEST_ID)).toBeNull();
  });

  it('renders banner when flag is enabled', () => {
    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    expect(getByTestId(TEST_ID)).toBeOnTheScreen();
  });

  it('displays outage title, description and both links', () => {
    const { getByText, getByTestId } = render(
      <PerpsServiceInterruptionBanner />,
    );

    expect(getByText("We're experiencing an outage")).toBeOnTheScreen();
    expect(
      getByText(/Some services are temporarily unavailable/),
    ).toBeOnTheScreen();
    expect(getByTestId(`${TEST_ID}-faq-link`)).toHaveTextContent(
      'See your options in FAQs',
    );
    expect(getByTestId(`${TEST_ID}-support-link`)).toHaveTextContent(
      'contact support',
    );
  });

  it('opens the Perps FAQ in the SimpleWebview when the FAQ link is pressed', () => {
    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    fireEvent.press(getByTestId(`${TEST_ID}-faq-link`));

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: SERVICE_INTERRUPTION_CONFIG.FaqUrl,
        title: strings(SERVICE_INTERRUPTION_CONFIG.FaqTitleKey),
      },
    });
    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
  });

  it('shows the support consent sheet with the support URL when the support link is pressed', () => {
    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    fireEvent.press(getByTestId(`${TEST_ID}-support-link`));

    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      SUPPORT_CONFIG.Url,
    );
  });

  // Covers only the call-site opener glue: invoking the opener passed to
  // openSupportWithConsent navigates to the webview. The consent modal
  // behavior itself is covered by the core support-consent tests.
  it('navigates to the SimpleWebview when the provided opener is invoked', () => {
    const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

    fireEvent.press(getByTestId(`${TEST_ID}-support-link`));
    const [open] = mockOpenSupportWithConsent.mock.calls[0];
    open(SUPPORT_CONFIG.Url);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: SUPPORT_CONFIG.Url,
        title: strings(SUPPORT_CONFIG.TitleKey),
      },
    });
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <PerpsServiceInterruptionBanner testID="custom-banner" />,
    );

    expect(getByTestId('custom-banner')).toBeOnTheScreen();
    expect(getByTestId('custom-banner-title')).toBeOnTheScreen();
  });

  it('applies the status-bar inset only when includesTopInset is set', () => {
    const { getByTestId, rerender } = render(
      <PerpsServiceInterruptionBanner includesTopInset />,
    );

    expect(getByTestId(TEST_ID)).toHaveStyle({ paddingTop: 47 });

    rerender(<PerpsServiceInterruptionBanner />);

    expect(getByTestId(TEST_ID)).not.toHaveStyle({ paddingTop: 47 });
  });

  describe('shrink on scroll', () => {
    it('keeps the description visible while the content is at the top', () => {
      const scrollY = makeMutable(0);

      const { getByTestId } = render(
        <PerpsServiceInterruptionBanner scrollY={scrollY} />,
      );

      expect(getDescription(getByTestId)).toHaveProp(
        'accessibilityElementsHidden',
        false,
      );
    });

    it('collapses the description once scrolled past the collapse threshold', async () => {
      const scrollY = makeMutable(0);

      const { getByTestId } = render(
        <PerpsServiceInterruptionBanner scrollY={scrollY} />,
      );

      await act(async () => {
        scrollY.value = SERVICE_INTERRUPTION_BANNER_COLLAPSE_SCROLL_PX + 1;
      });

      await waitFor(() =>
        expect(getDescription(getByTestId)).toHaveProp(
          'accessibilityElementsHidden',
          true,
        ),
      );
    });

    it('stays collapsed between the expand and collapse thresholds', async () => {
      const scrollY = makeMutable(0);

      const { getByTestId } = render(
        <PerpsServiceInterruptionBanner scrollY={scrollY} />,
      );

      await act(async () => {
        scrollY.value = SERVICE_INTERRUPTION_BANNER_COLLAPSE_SCROLL_PX + 1;
      });
      await waitFor(() =>
        expect(getDescription(getByTestId)).toHaveProp(
          'accessibilityElementsHidden',
          true,
        ),
      );
      await act(async () => {
        scrollY.value = SERVICE_INTERRUPTION_BANNER_EXPAND_SCROLL_PX + 1;
      });

      await waitFor(() =>
        expect(getDescription(getByTestId)).toHaveProp(
          'accessibilityElementsHidden',
          true,
        ),
      );
    });

    it('expands the description again when scrolled back to the top', async () => {
      const scrollY = makeMutable(0);

      const { getByTestId } = render(
        <PerpsServiceInterruptionBanner scrollY={scrollY} />,
      );

      await act(async () => {
        scrollY.value = SERVICE_INTERRUPTION_BANNER_COLLAPSE_SCROLL_PX + 1;
      });
      await waitFor(() =>
        expect(getDescription(getByTestId)).toHaveProp(
          'accessibilityElementsHidden',
          true,
        ),
      );
      await act(async () => {
        scrollY.value = 0;
      });

      await waitFor(() =>
        expect(getDescription(getByTestId)).toHaveProp(
          'accessibilityElementsHidden',
          false,
        ),
      );
    });

    it('never collapses when no scroll offset is provided', () => {
      const { getByTestId } = render(<PerpsServiceInterruptionBanner />);

      expect(getDescription(getByTestId)).toHaveProp(
        'accessibilityElementsHidden',
        false,
      );
    });
  });
});

describe('buildDescriptionSegments', () => {
  it('splits plain text around both links in sentence order', () => {
    expect(
      buildDescriptionSegments(
        'Down. See FAQs, or contact us.',
        'See FAQs',
        'contact us',
      ),
    ).toEqual([
      { text: 'Down. ' },
      { text: 'See FAQs', link: 'faq' },
      { text: ', or ' },
      { text: 'contact us', link: 'support' },
      { text: '.' },
    ]);
  });

  it('honours translations that reorder the links', () => {
    expect(
      buildDescriptionSegments(
        'contact us or See FAQs',
        'See FAQs',
        'contact us',
      ),
    ).toEqual([
      { text: 'contact us', link: 'support' },
      { text: ' or ' },
      { text: 'See FAQs', link: 'faq' },
    ]);
  });

  it('returns the sentence as plain text when no link label is present', () => {
    expect(buildDescriptionSegments('Down.', 'See FAQs', 'contact us')).toEqual(
      [{ text: 'Down.' }],
    );
  });

  it('ignores empty link labels', () => {
    expect(buildDescriptionSegments('Down. See FAQs.', 'See FAQs', '')).toEqual(
      [{ text: 'Down. ' }, { text: 'See FAQs', link: 'faq' }, { text: '.' }],
    );
  });
});
