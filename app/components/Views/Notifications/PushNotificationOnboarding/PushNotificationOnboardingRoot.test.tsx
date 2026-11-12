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
const mockMarkAnswered = jest.fn();

const mockPrePromptState = ({
  isHomeUnobstructed = true,
  nativeOsPermissionEnabled = null,
  variant = null,
}: Partial<ReturnType<typeof usePushPrePromptVariant>> = {}) => {
  mockUsePushPrePromptVariant.mockReturnValue({
    dismiss: mockDismissPrePrompt,
    isHomeUnobstructed,
    isResolving: false,
    markAnswered: mockMarkAnswered,
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
    mockMarkAnswered.mockResolvedValue(undefined);
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
        onUserAnswered: mockMarkAnswered,
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

  it('suspends presentation without discarding the pending snapshot', () => {
    mockPrePromptState({
      nativeOsPermissionEnabled: true,
      variant: 'push_permission',
    });
    const { rerender } = render(<PushNotificationOnboardingRoot />);

    // The hook resolves no variant while something is presented over home.
    mockPrePromptState({ isHomeUnobstructed: false, variant: null });
    rerender(<PushNotificationOnboardingRoot />);

    expect(getLatestProps()).toEqual(
      expect.objectContaining({
        isVisible: false,
        nativeOsPermissionEnabled: true,
        prePromptVariant: 'push_permission',
      }),
    );
    expect(mockMarkAnswered).not.toHaveBeenCalled();
  });

  it('resumes the same pending prompt when home returns', () => {
    mockPrePromptState({
      nativeOsPermissionEnabled: true,
      variant: 'push_permission',
    });
    const { rerender } = render(<PushNotificationOnboardingRoot />);

    mockPrePromptState({ isHomeUnobstructed: false, variant: null });
    rerender(<PushNotificationOnboardingRoot />);
    mockPrePromptState({ isHomeUnobstructed: true, variant: null });
    rerender(<PushNotificationOnboardingRoot />);

    expect(getLatestProps()).toEqual(
      expect.objectContaining({
        isVisible: true,
        nativeOsPermissionEnabled: true,
        prePromptVariant: 'push_permission',
      }),
    );
    expect(mockMarkAnswered).not.toHaveBeenCalled();
  });

  it('releases the session on completion before home is obstructed', () => {
    mockPrePromptState({
      nativeOsPermissionEnabled: true,
      variant: 'push_permission',
    });
    const { rerender } = render(<PushNotificationOnboardingRoot />);

    // Once answered, the hook resolves nothing.
    const { onComplete } = getLatestProps();
    mockPrePromptState({ variant: null });
    act(() => {
      onComplete('dismiss' as PushPrePromptCompletionReason);
    });
    mockPrePromptState({ isHomeUnobstructed: false, variant: null });
    rerender(<PushNotificationOnboardingRoot />);

    expect(mockMarkAnswered).not.toHaveBeenCalled();
  });

  it('keeps the action owner mounted when navigation covers an answered prompt', () => {
    mockPrePromptState({
      nativeOsPermissionEnabled: true,
      variant: 'push_permission',
    });
    const { rerender } = render(<PushNotificationOnboardingRoot />);

    act(() => {
      getLatestProps().onUserAnswered();
    });
    mockPrePromptState({ isHomeUnobstructed: false, variant: null });
    rerender(<PushNotificationOnboardingRoot />);

    expect(mockMarkAnswered).toHaveBeenCalledTimes(1);
    expect(getLatestProps().isVisible).toBe(false);
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
