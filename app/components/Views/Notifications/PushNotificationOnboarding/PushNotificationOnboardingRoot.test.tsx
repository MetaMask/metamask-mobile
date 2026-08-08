import React from 'react';
import { act, render } from '@testing-library/react-native';
import PushNotificationOnboardingRoot from './PushNotificationOnboardingRoot';
import PushNotificationOnboarding, {
  type PushPrePromptCompletionReason,
} from '.';
import { usePushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import PushNotificationPermissionFallback from './PushNotificationPermissionFallback';

jest.mock(
  '../../../../util/notifications/hooks/usePushPrePromptVariant',
  () => ({
    usePushPrePromptVariant: jest.fn(),
  }),
);

jest.mock('.', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./PushNotificationPermissionFallback', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

let mockIsPrePromptEnabled = true;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => {
    const { selectPrePushPromptEnabled } = jest.requireMock(
      '../../../../selectors/featureFlagController/engagement',
    );
    if (selector === selectPrePushPromptEnabled) return mockIsPrePromptEnabled;
    return undefined;
  }),
}));

jest.mock('../../../../selectors/featureFlagController/engagement', () => ({
  selectPrePushPromptEnabled: jest.fn(),
}));

const mockUsePushPrePromptVariant = jest.mocked(usePushPrePromptVariant);
const mockPushNotificationOnboarding = jest.mocked(PushNotificationOnboarding);
const mockPushNotificationPermissionFallback = jest.mocked(
  PushNotificationPermissionFallback,
);

const mockDismissPrePrompt = jest.fn();
const mockMarkPrePromptShown = jest.fn();

const mockPrePromptState = ({
  nativeOsPermissionEnabled = null,
  variant = null,
}: Partial<ReturnType<typeof usePushPrePromptVariant>> = {}) => {
  mockUsePushPrePromptVariant.mockReturnValue({
    dismiss: mockDismissPrePrompt,
    isResolving: false,
    markShown: mockMarkPrePromptShown,
    nativeOsPermissionEnabled,
    variant,
  });
};

const getLatestProps = () =>
  mockPushNotificationOnboarding.mock.calls[
    mockPushNotificationOnboarding.mock.calls.length - 1
  ][0];

describe('PushNotificationOnboardingRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPrePromptEnabled = true;
    mockPrePromptState();
  });

  it('does not render the sheet when no variant is available', () => {
    mockPrePromptState({ variant: null });

    render(<PushNotificationOnboardingRoot />);

    expect(mockPushNotificationOnboarding).not.toHaveBeenCalled();
  });

  it('renders the resolved pre-prompt variant', () => {
    mockPrePromptState({
      nativeOsPermissionEnabled: false,
      variant: 'push_permission',
    });

    render(<PushNotificationOnboardingRoot />);

    expect(getLatestProps()).toEqual(
      expect.objectContaining({
        dismissPrePrompt: mockDismissPrePrompt,
        isVisible: true,
        markPrePromptShown: mockMarkPrePromptShown,
        nativeOsPermissionEnabled: false,
        prePromptVariant: 'push_permission',
      }),
    );
  });

  it('keeps a visible variant latched until the pre-prompt completes', () => {
    mockPrePromptState({
      nativeOsPermissionEnabled: true,
      variant: 'push_permission',
    });
    const { rerender } = render(<PushNotificationOnboardingRoot />);

    mockPrePromptState({ variant: null });
    rerender(<PushNotificationOnboardingRoot />);

    expect(getLatestProps()).toEqual(
      expect.objectContaining({
        prePromptVariant: 'push_permission',
        nativeOsPermissionEnabled: true,
      }),
    );

    act(() => {
      getLatestProps().onComplete('dismiss' as PushPrePromptCompletionReason);
    });

    mockPrePromptState({ variant: null });
    mockPushNotificationOnboarding.mockClear();
    rerender(<PushNotificationOnboardingRoot />);

    expect(mockPushNotificationOnboarding).not.toHaveBeenCalled();
  });

  it('latches the native OS permission status for the visible pre-prompt', () => {
    mockPrePromptState({
      nativeOsPermissionEnabled: true,
      variant: 'push_permission',
    });
    const { rerender } = render(<PushNotificationOnboardingRoot />);

    mockPrePromptState({
      nativeOsPermissionEnabled: false,
      variant: 'marketing_consent',
    });
    rerender(<PushNotificationOnboardingRoot />);

    expect(getLatestProps()).toEqual(
      expect.objectContaining({
        nativeOsPermissionEnabled: true,
        prePromptVariant: 'push_permission',
      }),
    );
  });

  describe('feature flag gate', () => {
    it('renders the soft pre-prompt content when the flag is enabled', () => {
      mockIsPrePromptEnabled = true;
      mockPrePromptState({ variant: 'push_permission' });

      render(<PushNotificationOnboardingRoot />);

      expect(mockPushNotificationOnboarding).toHaveBeenCalled();
      expect(mockPushNotificationPermissionFallback).not.toHaveBeenCalled();
    });

    it('renders the permission fallback when the flag is disabled', () => {
      mockIsPrePromptEnabled = false;

      render(<PushNotificationOnboardingRoot />);

      expect(mockPushNotificationPermissionFallback).toHaveBeenCalled();
      expect(mockPushNotificationOnboarding).not.toHaveBeenCalled();
    });
  });
});
