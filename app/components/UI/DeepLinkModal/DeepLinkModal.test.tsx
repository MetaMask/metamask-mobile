import { renderScreen } from '../../../util/test/renderWithProvider';
import { DeepLinkModal } from './';
import { fireEvent, act } from '@testing-library/react-native';
import { useParams } from '../../../util/navigation/navUtils';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../components/hooks/useMetrics';
import { setDeepLinkModalDisabled } from '../../../actions/settings';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useNavigation } from '@react-navigation/native';
import { Linking, Platform } from 'react-native';

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(),
  };
});

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../components/hooks/useMetrics');

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

jest.mock('../../../util/metrics', () =>
  jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

(useNavigation as jest.MockedFn<typeof useNavigation>).mockReturnValue(
  mockNavigation as any,
);

describe('DeepLinkModal', () => {
  const mockOnContinue = jest.fn();
  const mockOnBack = jest.fn();
  const baseParams = {
    pageTitle: 'MetaMask',
    onContinue: mockOnContinue,
    onBack: mockOnBack,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'public',
    });
  });

  it('renders public link UI and tracks viewed event', () => {
    const { getByText, queryByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );

    const title = getByText('Proceed with caution');
    const description = getByText(
      /You were sent here by a third party, not MetaMask. You'll open MetaMask if you continue./i,
    );
    const checkbox = queryByText(/Don't remind me again/i);

    expect(title).toBeOnTheScreen();
    expect(description).toBeOnTheScreen();
    expect(checkbox).not.toBeOnTheScreen();

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_VIEWED,
    )
      .addProperties({ deviceProp: 'Device value' })
      .build();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('renders private link UI and tracks viewed event', () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'private',
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );

    const title = getByText('Redirecting you to MetaMask');
    const description = getByText(/You'll open MetaMask if you continue./i);
    const checkbox = getByText(/Don't remind me again/i);

    expect(title).toBeOnTheScreen();
    expect(description).toBeOnTheScreen();
    expect(checkbox).toBeOnTheScreen();

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_VIEWED,
    )
      .addProperties({ deviceProp: 'Device value' })
      .build();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls onContinue when primary CTA is pressed', () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'private',
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );
    const continueButton = getByText('Continue');

    act(() => {
      fireEvent.press(continueButton);
    });

    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('renders invalid link UI and tracks viewed event', () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'invalid',
    });
    const { getByText, queryByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );

      const title = getByText(/This page doesn't exist/i);
      const description = getByText(
        /We can't find the page you're looking for./i,
      );
    const goToHomeButton = getByText('Go to the home page');
    const storeLinkText = getByText(
      "Update to the latest version of MetaMask and we'll take you to the right place.",
    );
    const checkbox = queryByText(/Don't remind me again/i);

    expect(title).toBeOnTheScreen();
    expect(description).toBeOnTheScreen();
    expect(goToHomeButton).toBeOnTheScreen();
    expect(storeLinkText).toBeOnTheScreen();
    expect(checkbox).not.toBeOnTheScreen(); // Checkbox only for private link

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_VIEWED,
    )
      .addProperties({ deviceProp: 'Device value' })
      .build();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  describe('store link', () => {
    it('opens app store when store link is pressed on iOS', async () => {
      (useParams as jest.Mock).mockReturnValue({
        ...baseParams,
        linkType: 'invalid',
      });
      const { getByText } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const storeLink = getByText('Update to the latest version of MetaMask');

      await act(async () => {
        fireEvent.press(storeLink);
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'itms-apps://apps.apple.com/app/metamask-blockchain-wallet/id1438144202',
      );
    });

    it('opens play store when store link is pressed on Android', async () => {
      Platform.OS = 'android';

      (useParams as jest.Mock).mockReturnValue({
        ...baseParams,
        linkType: 'invalid',
      });
      const { getByText } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const storeLink = getByText('Update to the latest version of MetaMask');

      await act(async () => {
        fireEvent.press(storeLink);
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'market://details?id=io.metamask',
      );
    });
  });

  it('navigates to home page when continue button is pressed for invalid link', async () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'invalid',
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );
    const continueButton = getByText('Go to the home page');

    await act(async () => {
      fireEvent.press(continueButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome', {
      screen: 'WalletTabStackFlow',
      params: {
        screen: 'WalletView',
      },
    });
    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('toggles checkbox, dispatches action, and tracks event', () => {
    (useParams as jest.Mock).mockReturnValue({
      ...baseParams,
      linkType: 'private',
    });
    const { getByText } = renderScreen(
      DeepLinkModal,
      { name: 'DeepLinkModal' },
      { state: {} },
    );
    const checkbox = getByText(/Don't remind me again/i);
    act(() => {
      fireEvent.press(checkbox);
    });
    const checkboxEventSelected = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_CHECKED,
    )
      .addProperties({ deviceProp: 'Device value' })
      .build();

    expect(mockDispatch).toHaveBeenCalledWith(setDeepLinkModalDisabled(true));
    expect(mockTrackEvent).toHaveBeenCalledWith(checkboxEventSelected);

    // Toggle again
    act(() => {
      fireEvent.press(checkbox);
    });
    const checkboxEventUnselected = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DEEP_LINK_MODAL_PRIVATE_DONT_REMIND_ME_AGAIN_CHECKBOX_CHECKED,
    )
      .addProperties({ deviceProp: 'Device value' })
      .build();
    expect(mockTrackEvent).toHaveBeenCalledWith(checkboxEventUnselected);
    expect(mockDispatch).toHaveBeenCalledWith(setDeepLinkModalDisabled(false));
  });

  it.each`
    linkType     | continueButtonText | eventContinue                                                 | pageTitle
    ${'public'}  | ${'Continue'}      | ${MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_CONTINUE_CLICKED}  | ${'MetaMask'}
    ${'private'} | ${'Continue'}      | ${MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_CONTINUE_CLICKED} | ${'MetaMask'}
  `(
    'tracks correct action event and pageTitle when continue button is pressed for $linkType link',
    async ({ linkType, continueButtonText, eventContinue, pageTitle }) => {
      (useParams as jest.Mock).mockReturnValue({ ...baseParams, linkType });
      const { getByText } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const continueButton = getByText(continueButtonText);
      act(() => {
        fireEvent.press(continueButton);
      });
      const expectedEvent = MetricsEventBuilder.createEventBuilder(
        eventContinue,
      )
        .addProperties({ deviceProp: 'Device value', pageTitle })
        .build();
      expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
    },
  );

  it.each`
    linkType     | eventGoBack
    ${'public'}  | ${MetaMetricsEvents.DEEP_LINK_PUBLIC_MODAL_DISMISSED}
    ${'private'} | ${MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_DISMISSED}
    ${'invalid'} | ${MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_DISMISSED}
  `(
    'tracks correct action event when back button is pressed for $linkType link',
    async ({ linkType, eventGoBack }) => {
      (useParams as jest.Mock).mockReturnValue({ ...baseParams, linkType });
      const { getByTestId } = renderScreen(
        DeepLinkModal,
        { name: 'DeepLinkModal' },
        { state: {} },
      );
      const dismissButton = getByTestId('deep-link-modal-close-button');
      act(() => {
        fireEvent.press(dismissButton);
      });
      const expectedEvent = MetricsEventBuilder.createEventBuilder(eventGoBack)
        .addProperties({ deviceProp: 'Device value' })
        .build();
      expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
    },
  );
});
