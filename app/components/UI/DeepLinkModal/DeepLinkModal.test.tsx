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

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn(),
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

    const checkbox = queryByText(/Don't remind me again/i);
    const title = getByText('Proceed with caution');
    const description = getByText(
      /You were sent here by a third party, not MetaMask. You'll open MetaMask if you continue./i,
    );
    expect(title).toBeDefined();
    expect(description).toBeDefined();
    expect(checkbox).toBeNull();

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
    expect(title).toBeDefined();
    expect(description).toBeDefined();
    expect(checkbox).toBeDefined();

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DEEP_LINK_PRIVATE_MODAL_VIEWED,
    )
      .addProperties({ deviceProp: 'Device value' })
      .build();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
  });

  it('calls onContinue on primary CTA pressed', () => {
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
    const checkbox = queryByText(/Don't remind me again/i);
    expect(title).toBeDefined();
    expect(description).toBeDefined();
    expect(checkbox).toBeDefined();

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.DEEP_LINK_INVALID_MODAL_VIEWED,
    )
      .addProperties({ deviceProp: 'Device value' })
      .build();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
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
    'should track correct action event and pageTitleon continue button pressed when linkType is $linkType',
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
    'should track correct action event on back button pressed when linkType is $linkType',
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
