import React from 'react';
import { render } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import ScreenshotDeterrent from './ScreenshotDeterrent';
import PreventScreenshot from '../../../core/PreventScreenshot';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../core/PreventScreenshot', () => ({
  forbid: jest.fn(),
  allow: jest.fn(),
}));

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => {
  const interactionManager = {
    runAfterInteractions: (callback: () => void) => callback(),
  };
  return {
    __esModule: true,
    default: interactionManager,
    ...interactionManager,
  };
});

let mockCalled = false;
jest.mock('../../hooks/useScreenshotDeterrent', () => {
  const mock = (callback: () => void) => {
    if (!mockCalled) {
      callback();
      mockCalled = true;
    }
    return [jest.fn()];
  };
  return mock;
});

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

const mockTrackEvent = jest.fn();

// mock useNavigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics');

// mock InteractionManager.runAfterInteractions
const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
  cb();
  return {
    then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
    done: (onfulfilled: () => void, onrejected: () => void) =>
      Promise.resolve().then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});

describe('ScreenshotDeterrent with isSRP = true', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalled = false;
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation(mockRunAfterInteractions);
    jest
      .mocked(useAnalytics)
      .mockReturnValue(
        createMockUseAnalyticsHook({ trackEvent: mockTrackEvent }),
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component props handling', () => {
    it('does not block capture when disabled', () => {
      const { toJSON } = render(
        <ScreenshotDeterrent enabled={false} isSRP hasNavigation />,
      );

      expect(toJSON()).not.toBeNull();
      expect(PreventScreenshot.forbid).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('blocks capture when enabled', () => {
      const { toJSON } = render(
        <ScreenshotDeterrent enabled isSRP hasNavigation />,
      );

      expect(toJSON()).not.toBeNull();
      expect(PreventScreenshot.forbid).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });
});
