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

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: (callback: () => void) => callback(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

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

jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

describe('ScreenshotDeterrent with isSRP = true', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalled = false;
    jest
      .mocked(useAnalytics)
      .mockReturnValue(
        createMockUseAnalyticsHook({ trackEvent: mockTrackEvent }),
      );
  });

  describe('Component props handling', () => {
    it('render matches snapshot when enabled = false, isSRP = true, hasNavigation = true', () => {
      const { toJSON } = render(
        <ScreenshotDeterrent enabled={false} isSRP hasNavigation />,
      );
      // expect to be snapshot
      expect(toJSON()).toMatchSnapshot();
      expect(PreventScreenshot.forbid).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('render matches snapshot when enabled = true, isSRP = true, hasNavigation = true', () => {
      const { toJSON } = render(
        <ScreenshotDeterrent enabled isSRP hasNavigation />,
      );
      expect(toJSON()).toMatchSnapshot();
      expect(PreventScreenshot.forbid).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });
});
