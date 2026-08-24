import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  CARD_SUPPORT_EMAIL,
  DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
  IMMERSVE_REPORT_TRANSACTION_ID_PARAM,
} from '../../constants';
import CardReportTransaction, {
  buildReportTransactionUrl,
} from './CardReportTransaction';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
const mockUseSelector = jest.fn();
const mockGetCardSupportEmail = jest.fn(() => 'support@example.com');

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
    useRoute: () => ({
      params: { transactionId: 'tx-123' },
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: () => ({ onBack: mockGoBack }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
      build: () => ({}),
    }),
  }),
}));

jest.mock('../../hooks/useRegistrationSettings', () => ({
  __esModule: true,
  default: () => ({ data: undefined }),
}));

jest.mock('../../util/registrationSettings', () => ({
  getCardSupportEmail: () => mockGetCardSupportEmail(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ToastContext: ReactActual.createContext({
      toastRef: {
        current: {
          showToast: (...args: unknown[]) => mockShowToast(...args),
        },
      },
    }),
    ToastVariants: { Icon: 'Icon' },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardActiveProviderId: 'selectCardActiveProviderId',
  selectCardUserLocation: 'selectCardUserLocation',
}));

jest.mock('../../../../../selectors/featureFlagController/card', () => ({
  selectCardImmersveConfig: 'selectCardImmersveConfig',
}));

function mockSelectors({
  providerId = CardProviderIds.Baanx,
  reportTransactionUrl,
}: {
  providerId?: string;
  reportTransactionUrl?: string;
} = {}) {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === 'selectCardActiveProviderId') {
      return providerId;
    }
    if (selector === 'selectCardUserLocation') {
      return 'us';
    }
    if (selector === 'selectCardImmersveConfig') {
      return { reportTransactionUrl };
    }
    return undefined;
  });
}

describe('buildReportTransactionUrl', () => {
  it('keeps existing query params and appends the transaction id', () => {
    const url = buildReportTransactionUrl(
      DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
      'tx-123',
    );

    const parsed = new URL(url);
    expect(parsed.searchParams.get('ticket_form_id')).toBe('22905679582745');
    expect(parsed.searchParams.get(IMMERSVE_REPORT_TRANSACTION_ID_PARAM)).toBe(
      'tx-123',
    );
    expect(url).not.toContain('??');
  });

  it('builds distinct urls for different transaction ids', () => {
    const first = buildReportTransactionUrl(
      DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
      'tx-a',
    );
    const second = buildReportTransactionUrl(
      DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
      'tx-b',
    );

    expect(first).not.toBe(second);
  });
});

describe('CardReportTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCardSupportEmail.mockReturnValue('support@example.com');
    mockSelectors();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the report copy and actions', () => {
    const { getByText, getByTestId } = render(<CardReportTransaction />);

    expect(getByText('card.transactions.report_title')).toBeOnTheScreen();
    expect(
      getByText('card.transactions.report_body_merchant'),
    ).toBeOnTheScreen();
    expect(
      getByText('card.transactions.report_body_continue'),
    ).toBeOnTheScreen();
    expect(getByText('card.transactions.report_back')).toBeOnTheScreen();
    expect(
      getByTestId('card-report-transaction-file-button'),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    const { getByText } = render(<CardReportTransaction />);

    fireEvent.press(getByText('card.transactions.report_back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the Immersve report form in a simple webview', () => {
    mockSelectors({
      providerId: CardProviderIds.Immersve,
      reportTransactionUrl: 'https://help.example.com/report?foo=1',
    });
    const { getByTestId } = render(<CardReportTransaction />);

    fireEvent.press(getByTestId('card-report-transaction-file-button'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [route, navParams] = mockNavigate.mock.calls[0] as [
      string,
      { screen: string; params: { url: string } },
    ];
    expect(route).toBe(Routes.WEBVIEW.MAIN);
    expect(navParams.screen).toBe(Routes.WEBVIEW.SIMPLE);
    const parsed = new URL(navParams.params.url);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://help.example.com/report',
    );
    expect(parsed.searchParams.get('foo')).toBe('1');
    expect(parsed.searchParams.get(IMMERSVE_REPORT_TRANSACTION_ID_PARAM)).toBe(
      'tx-123',
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('falls back to the default Immersve report url when config is empty', () => {
    mockSelectors({
      providerId: CardProviderIds.Immersve,
      reportTransactionUrl: undefined,
    });
    const { getByTestId } = render(<CardReportTransaction />);

    fireEvent.press(getByTestId('card-report-transaction-file-button'));

    const expectedUrl = buildReportTransactionUrl(
      DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
      'tx-123',
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: expectedUrl },
    });
  });

  it('opens a mailto link for non-Immersve providers', async () => {
    mockSelectors({ providerId: CardProviderIds.Baanx });
    const { getByTestId } = render(<CardReportTransaction />);

    fireEvent.press(getByTestId('card-report-transaction-file-button'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'mailto:support@example.com',
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('uses the default support email when registration email is empty', async () => {
    mockGetCardSupportEmail.mockReturnValue('');
    mockSelectors({ providerId: CardProviderIds.Baanx });
    const { getByTestId } = render(<CardReportTransaction />);

    fireEvent.press(getByTestId('card-report-transaction-file-button'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        `mailto:${CARD_SUPPORT_EMAIL}`,
      );
    });
  });

  it('shows an error toast when opening mailto throws', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('boom'));
    const { getByTestId } = render(<CardReportTransaction />);

    fireEvent.press(getByTestId('card-report-transaction-file-button'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'card.transactions.report_open_error' }],
        }),
      );
    });
  });
});
