import { renderHook } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../util/analytics/actionButtonTracking';
import { AddressListViewedSource } from '../../../util/analytics/addressListViewedTracking';
import Logger from '../../../util/Logger';
import { useWalletHomeOnboardingChecklistReceivePress } from './useWalletHomeOnboardingChecklistReceivePress';

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

let mockSelectedAccountGroupId: string | undefined = 'entropy:wallet/0';
jest.mock('react-redux', () => ({
  useSelector: () => mockSelectedAccountGroupId,
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ event: 'built' });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));
jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigateWithDetails = jest.fn();
jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  navigateWithDetails: (...args: unknown[]) => mockNavigateWithDetails(...args),
}));

const mockCreateAddressListNavigationDetails = jest.fn((params: unknown) => ({
  details: params,
}));
jest.mock('../../Views/MultichainAccounts/AddressList', () => ({
  createAddressListNavigationDetails: (params: unknown) =>
    mockCreateAddressListNavigationDetails(params),
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

describe('useWalletHomeOnboardingChecklistReceivePress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedAccountGroupId = 'entropy:wallet/0';
  });

  it('tracks Action Button Clicked with the onboarding checklist location', () => {
    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistReceivePress(),
    );

    result.current();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ACTION_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FIRST_POSITION,
      button_label: 'Receive',
      location: ActionLocation.ONBOARDING_CHECKLIST,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built' });
  });

  it('opens the address list with the onboarding checklist source', () => {
    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistReceivePress(),
    );

    result.current();

    expect(mockCreateAddressListNavigationDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'entropy:wallet/0',
        source: AddressListViewedSource.ONBOARDING_CHECKLIST,
      }),
    );
    expect(mockNavigateWithDetails).toHaveBeenCalledWith(
      mockNavigation,
      expect.anything(),
    );
  });

  it('logs and skips navigation when no account group is selected', () => {
    mockSelectedAccountGroupId = undefined;
    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistReceivePress(),
    );

    result.current();

    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockNavigateWithDetails).not.toHaveBeenCalled();
  });
});
