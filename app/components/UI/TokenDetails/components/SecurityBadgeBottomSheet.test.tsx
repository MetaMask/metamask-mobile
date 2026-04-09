import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SecurityBadgeBottomSheet from './SecurityBadgeBottomSheet';
import { IconName, IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRouteParams = {
  icon: IconName.SecurityTick,
  iconColor: IconColor.SuccessDefault,
  title: 'Test Title',
  description: 'Test Description',
  source: 'badge',
  severity: 'Verified',
  tokenAddress: '0x1234567890abcdef',
  tokenSymbol: 'TEST',
  chainId: '0x1',
};

let mockUseRouteImpl = jest.fn(() => ({
  params: mockRouteParams,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => mockUseRouteImpl(),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      isFocused: jest.fn(() => true),
    }),
  };
});

describe('SecurityBadgeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouteImpl = jest.fn(() => ({
      params: mockRouteParams,
    }));
  });

  it('renders without crashing', () => {
    const { getByText } = render(<SecurityBadgeBottomSheet />);
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
  });

  it('tracks bottom sheet opened event on mount', () => {
    render(<SecurityBadgeBottomSheet />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_OPENED,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('displays "Got it" button when onProceed is not provided', () => {
    const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

    expect(getByText(strings('security_trust.got_it'))).toBeTruthy();
    expect(queryByText(strings('security_trust.proceed'))).toBeNull();
    expect(queryByText(strings('security_trust.cancel'))).toBeNull();
  });

  it('displays title and description from route params', () => {
    const { getByText } = render(<SecurityBadgeBottomSheet />);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
  });

  it('displays proceed and cancel buttons when onProceed is provided', () => {
    const mockOnProceed = jest.fn();

    mockUseRouteImpl = jest.fn(() => ({
      params: {
        ...mockRouteParams,
        onProceed: mockOnProceed,
      },
    }));

    const { getByText, queryByText } = render(<SecurityBadgeBottomSheet />);

    expect(getByText(strings('security_trust.proceed'))).toBeTruthy();
    expect(getByText(strings('security_trust.cancel'))).toBeTruthy();
    expect(queryByText(strings('security_trust.got_it'))).toBeNull();
  });

  it('calls onProceed and tracks action when proceed button is pressed', () => {
    const mockOnProceed = jest.fn();

    mockUseRouteImpl = jest.fn(() => ({
      params: {
        ...mockRouteParams,
        onProceed: mockOnProceed,
      },
    }));

    const { getByText } = render(<SecurityBadgeBottomSheet />);

    fireEvent.press(getByText(strings('security_trust.proceed')));

    expect(mockOnProceed).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_ACTION_TAKEN,
    );
  });

  it('tracks cancel action when cancel button is pressed', () => {
    const mockOnProceed = jest.fn();

    mockUseRouteImpl = jest.fn(() => ({
      params: {
        ...mockRouteParams,
        onProceed: mockOnProceed,
      },
    }));

    const { getByText } = render(<SecurityBadgeBottomSheet />);

    fireEvent.press(getByText(strings('security_trust.cancel')));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SECURITY_TRUST_BOTTOM_SHEET_ACTION_TAKEN,
    );
  });
});
