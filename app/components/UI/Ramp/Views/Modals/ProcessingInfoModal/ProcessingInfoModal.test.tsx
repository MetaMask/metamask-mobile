import React from 'react';
import { fireEvent, waitFor, screen } from '@testing-library/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import ProcessingInfoModal, {
  type ProcessingInfoModalParams,
} from './ProcessingInfoModal';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  callback?.();
});

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.forwardRef(
      (
        {
          children,
          testID,
        }: {
          children: React.ReactNode;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    );
  },
);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(),
  open: jest.fn(),
}));

const mockUseParams = jest.fn(
  (): ProcessingInfoModalParams => ({
    providerName: 'Transak',
    providerSupportUrl: 'https://transak.com/support',
    statusDescription:
      'Card purchases typically take a few minutes. You can contact support if you have questions.',
  }),
);

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

function renderModal() {
  mockCreateEventBuilder.mockReturnValue({
    addProperties: mockAddProperties,
    build: mockBuild,
  });
  mockAddProperties.mockReturnValue({ build: mockBuild });
  return renderWithProvider(<ProcessingInfoModal />, {
    state: { engine: { backgroundState } },
  });
}

describe('ProcessingInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      providerName: 'Transak',
      providerSupportUrl: 'https://transak.com/support',
      statusDescription:
        'Card purchases typically take a few minutes. You can contact support if you have questions.',
    });
  });

  it('renders correctly', () => {
    renderModal();
    expect(screen.getByTestId('processing-info-modal')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders the close button', () => {
    renderModal();
    expect(
      screen.getByTestId('processing-info-modal-close-button'),
    ).toBeOnTheScreen();
  });

  it('renders description text', () => {
    renderModal();
    expect(
      screen.getByText(
        'Card purchases typically take a few minutes. You can contact support if you have questions.',
      ),
    ).toBeOnTheScreen();
  });

  it('renders support button with provider name', () => {
    renderModal();
    expect(screen.getByText('Go to Transak support page')).toBeOnTheScreen();
  });

  it('opens InAppBrowser and closes sheet when support is pressed and browser is available', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
    (InAppBrowser.open as jest.Mock).mockResolvedValue(undefined);

    renderModal();

    fireEvent.press(screen.getByText('Go to Transak support page'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_EXTERNAL_LINK_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Order Details',
        external_link_description: 'Provider Support',
        url_domain: 'transak.com',
        ramp_type: 'UNIFIED_BUY_2',
      }),
    );

    await waitFor(() => {
      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        'https://transak.com/support',
      );
    });
  });

  it('navigates to SimpleWebview when InAppBrowser is not available', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    renderModal();

    fireEvent.press(screen.getByText('Go to Transak support page'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://transak.com/support',
          title: 'Transak',
        },
      });
    });
    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
  });

  it('uses raw support URL as url_domain when URL parsing fails', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
    mockUseParams.mockReturnValue({
      providerName: 'P',
      providerSupportUrl: 'not-a-valid-url',
      statusDescription: 'Status',
    });

    renderModal();

    fireEvent.press(screen.getByText('Go to P support page'));

    await waitFor(() => {
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          url_domain: 'not-a-valid-url',
        }),
      );
    });
  });

  it('renders without description when statusDescription is absent', () => {
    mockUseParams.mockReturnValue({
      providerName: 'MoonPay',
      providerSupportUrl: 'https://moonpay.com/help',
    });

    renderModal();

    expect(
      screen.queryByText(
        'Card purchases typically take a few minutes. You can contact support if you have questions.',
      ),
    ).toBeNull();
    expect(screen.getByText('Go to MoonPay support page')).toBeOnTheScreen();
  });

  it('does not open browser when providerSupportUrl is missing', () => {
    mockUseParams.mockReturnValue({
      providerName: 'Transak',
      statusDescription: 'Waiting',
    });

    renderModal();

    fireEvent.press(screen.getByText('Go to Transak support page'));

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(InAppBrowser.open).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
