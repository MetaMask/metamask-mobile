import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import TokenNotAvailableModal from './TokenNotAvailableModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn(() => ({ name: 'test-event' }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const MOCK_ASSET_ID =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockUseParams = jest.fn().mockReturnValue({
  assetId: MOCK_ASSET_ID,
});

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

let mockSelectedProvider: unknown = {
  id: '/providers/transak',
  name: 'Transak',
};

let mockSelectedToken: unknown = {
  assetId: MOCK_ASSET_ID,
  name: 'USD Coin',
  symbol: 'USDC',
};

jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    selectedProvider: mockSelectedProvider,
    selectedToken: mockSelectedToken,
  }),
}));

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  if (callback) callback();
});

let capturedOnClose: ((hasPendingAction?: boolean) => void) | undefined;

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          onClose?: (hasPendingAction?: boolean) => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        capturedOnClose = onClose;
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
    { assetId: MOCK_ASSET_ID },
  );
}

describe('TokenNotAvailableModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
    mockAddProperties.mockClear();
    mockSelectedProvider = {
      id: '/providers/transak',
      name: 'Transak',
    };
    mockSelectedToken = {
      assetId: MOCK_ASSET_ID,
      name: 'USD Coin',
      symbol: 'USDC',
    };
  });

  it('matches snapshot', () => {
    const { toJSON } = render(TokenNotAvailableModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to token selection when Change token is pressed', () => {
    const { getByText } = render(TokenNotAvailableModal);

    fireEvent.press(getByText('Change token'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(expect.any(Function));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.TOKEN_SELECTION, {
      screen: Routes.RAMP.TOKEN_SELECTION,
    });
  });

  it('navigates to provider picker when Change provider is pressed', () => {
    const { getByText } = render(TokenNotAvailableModal);

    fireEvent.press(getByText('Change provider'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(expect.any(Function));
    expect(mockNavigate).toHaveBeenCalledWith(
      'RampModals',
      expect.objectContaining({
        screen: 'RampProviderSelectionModal',
        params: { assetId: MOCK_ASSET_ID, skipQuotes: true },
      }),
    );
  });

  it('closes the bottom sheet when the close button is pressed', () => {
    const { getByTestId } = render(TokenNotAvailableModal);
    const closeButton = getByTestId('bottomsheetheader-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('navigates to token selection when modal is dismissed without a pending action', () => {
    render(TokenNotAvailableModal);

    capturedOnClose?.(false);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.TOKEN_SELECTION, {
      screen: Routes.RAMP.TOKEN_SELECTION,
    });
  });

  it('does not navigate on dismiss when there is a pending action', () => {
    render(TokenNotAvailableModal);

    capturedOnClose?.(true);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('matches snapshot with missing provider and token names', () => {
    mockSelectedProvider = null;
    mockSelectedToken = null;

    const { toJSON } = render(TokenNotAvailableModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('fires RAMPS_SCREEN_VIEWED analytics event on mount', () => {
    render(TokenNotAvailableModal);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_SCREEN_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      location: 'Token Unavailable Modal',
      ramp_type: 'UNIFIED_BUY_2',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('fires RAMPS_CHANGE_TOKEN_BUTTON_CLICKED analytics event when Change token is pressed', () => {
    const { getByText } = render(TokenNotAvailableModal);
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();

    fireEvent.press(getByText('Change token'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_CHANGE_TOKEN_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      current_provider: 'Transak',
      location: 'Token Unavailable Modal',
      ramp_type: 'UNIFIED_BUY_2',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('fires RAMPS_CLOSE_BUTTON_CLICKED analytics event when close button is pressed', () => {
    const { getByTestId } = render(TokenNotAvailableModal);
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();

    fireEvent.press(getByTestId('bottomsheetheader-close-button'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_CLOSE_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      location: 'Token Unavailable Modal',
      ramp_type: 'UNIFIED_BUY_2',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
