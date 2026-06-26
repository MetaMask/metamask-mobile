import React from 'react';
import { render } from '@testing-library/react-native';
import PushNotificationPermissionFallback from './PushNotificationPermissionFallback';
import {
  usePushPrePromptVariant,
  type PushPrePromptVariant,
} from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';

jest.mock(
  '../../../../util/notifications/hooks/usePushPrePromptVariant',
  () => ({
    usePushPrePromptVariant: jest.fn(),
  }),
);

jest.mock('../../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: jest.fn(),
}));

const mockUsePushPrePromptVariant = jest.mocked(usePushPrePromptVariant);
const mockUseEnableNotifications = jest.mocked(useEnableNotifications);

const mockEnableNotifications = jest.fn().mockResolvedValue(undefined);

const mockVariant = (variant: PushPrePromptVariant) => {
  mockUsePushPrePromptVariant.mockReturnValue({
    dismiss: jest.fn(),
    isResolving: false,
    markShown: jest.fn().mockResolvedValue(undefined),
    nativeOsPermissionEnabled: null,
    variant,
  });
};

describe('PushNotificationPermissionFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEnableNotifications.mockReturnValue({
      enableNotifications: mockEnableNotifications,
      isEnablingNotifications: false,
      isEnablingPushNotifications: false,
      loading: false,
      error: null,
      data: false,
    });
    mockVariant(null);
  });

  it('renders nothing', () => {
    const { toJSON } = render(<PushNotificationPermissionFallback />);
    expect(toJSON()).toBeNull();
  });

  it('calls enableNotifications when the variant is push_permission', () => {
    mockVariant('push_permission');
    render(<PushNotificationPermissionFallback />);
    expect(mockEnableNotifications).toHaveBeenCalled();
  });

  it('calls enableNotifications only once for repeated re-renders with same variant', () => {
    mockVariant('push_permission');
    const initialCallCount = mockEnableNotifications.mock.calls.length;

    const { rerender } = render(<PushNotificationPermissionFallback />);
    const callsAfterMount = mockEnableNotifications.mock.calls.length;

    rerender(<PushNotificationPermissionFallback />);
    rerender(<PushNotificationPermissionFallback />);

    // No new calls should occur after the initial mount
    expect(mockEnableNotifications.mock.calls.length).toBe(callsAfterMount);
    expect(callsAfterMount).toBeGreaterThan(initialCallCount);
  });

  it('does not call enableNotifications when the variant is marketing_consent', () => {
    mockVariant('marketing_consent');
    render(<PushNotificationPermissionFallback />);
    expect(mockEnableNotifications).not.toHaveBeenCalled();
  });

  it('does not call enableNotifications when the variant is null', () => {
    mockVariant(null);
    render(<PushNotificationPermissionFallback />);
    expect(mockEnableNotifications).not.toHaveBeenCalled();
  });
});
