import React from 'react';
import { render } from '@testing-library/react-native';
import { Alert, InteractionManager } from 'react-native';
import CardScreenshotDeterrent from './CardScreenshotDeterrent';
import PreventScreenshot from '../../../../../core/PreventScreenshot';
import { strings } from '../../../../../../locales/i18n';

// Mock PreventScreenshot
jest.mock('../../../../../core/PreventScreenshot', () => ({
  forbid: jest.fn(),
  allow: jest.fn(),
}));

// Mock InteractionManager to execute callback immediately
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((callback) => {
    if (typeof callback === 'function') {
      callback();
    }
    return {
      cancel: jest.fn(),
      done: jest.fn(),
      then: jest.fn((onfulfilled) => Promise.resolve(onfulfilled?.())),
    };
  });

// Store cleanup function from useFocusEffect
let focusEffectCleanup: (() => void) | undefined;

// Mock useFocusEffect to execute callback and store cleanup
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback: () => (() => void) | undefined) => {
    focusEffectCleanup = callback();
  }),
}));

// Track enableScreenshotWarning calls and capture warning callback
const mockEnableScreenshotWarning = jest.fn();
let capturedWarningCallback: (() => void) | null = null;

jest.mock('../../../../hooks/useScreenshotDeterrent', () =>
  jest.fn((callback: () => void) => {
    capturedWarningCallback = callback;
    return [mockEnableScreenshotWarning];
  }),
);

describe('CardScreenshotDeterrent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedWarningCallback = null;
    focusEffectCleanup = undefined;
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<CardScreenshotDeterrent enabled={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders an empty View', () => {
      const { toJSON } = render(<CardScreenshotDeterrent enabled />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('screenshot warning', () => {
    it('enables screenshot warning when enabled prop is true', () => {
      render(<CardScreenshotDeterrent enabled />);
      expect(mockEnableScreenshotWarning).toHaveBeenCalledWith(true);
    });

    it('disables screenshot warning when enabled prop is false', () => {
      render(<CardScreenshotDeterrent enabled={false} />);
      expect(mockEnableScreenshotWarning).toHaveBeenCalledWith(false);
    });

    it('shows native alert with card-specific message when screenshot is detected', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      render(<CardScreenshotDeterrent enabled />);

      // Trigger the screenshot warning callback
      expect(capturedWarningCallback).not.toBeNull();
      capturedWarningCallback?.();

      expect(alertSpy).toHaveBeenCalledWith(
        strings('screenshot_deterrent.title'),
        strings('screenshot_deterrent.card_description'),
        [
          {
            text: strings('reveal_credential.got_it'),
            onPress: expect.any(Function),
          },
        ],
        { cancelable: false },
      );

      alertSpy.mockRestore();
    });

    it('prevents multiple alerts from showing simultaneously', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      render(<CardScreenshotDeterrent enabled />);

      // Trigger the screenshot warning callback twice
      capturedWarningCallback?.();
      capturedWarningCallback?.();

      // Alert should only be called once
      expect(alertSpy).toHaveBeenCalledTimes(1);

      alertSpy.mockRestore();
    });

    it('allows new alert after previous one is dismissed', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      render(<CardScreenshotDeterrent enabled />);

      // Trigger first alert
      capturedWarningCallback?.();
      expect(alertSpy).toHaveBeenCalledTimes(1);

      // Simulate pressing "Got it" button
      const alertButtons = alertSpy.mock.calls[0][2] as {
        onPress?: () => void;
      }[];
      const gotItButton = alertButtons?.[0];
      gotItButton?.onPress?.();

      // Trigger second alert
      capturedWarningCallback?.();
      expect(alertSpy).toHaveBeenCalledTimes(2);

      alertSpy.mockRestore();
    });
  });

  describe('screenshot prevention (Android)', () => {
    it('calls PreventScreenshot.forbid when enabled', () => {
      render(<CardScreenshotDeterrent enabled />);
      expect(PreventScreenshot.forbid).toHaveBeenCalled();
    });

    it('does not call PreventScreenshot.forbid when disabled', () => {
      render(<CardScreenshotDeterrent enabled={false} />);
      expect(PreventScreenshot.forbid).not.toHaveBeenCalled();
    });

    it('calls PreventScreenshot.allow on cleanup', () => {
      render(<CardScreenshotDeterrent enabled />);

      // Execute the cleanup function stored from useFocusEffect
      expect(focusEffectCleanup).toBeDefined();
      focusEffectCleanup?.();

      expect(PreventScreenshot.allow).toHaveBeenCalled();
    });
  });

  describe('prop changes', () => {
    it('updates screenshot warning when enabled prop changes', () => {
      const { rerender } = render(<CardScreenshotDeterrent enabled={false} />);
      expect(mockEnableScreenshotWarning).toHaveBeenLastCalledWith(false);

      rerender(<CardScreenshotDeterrent enabled />);
      expect(mockEnableScreenshotWarning).toHaveBeenLastCalledWith(true);
    });
  });
});
