import React from 'react';
import { cleanup, render } from '@testing-library/react-native';
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

// The capture block is module state shared by every deterrent in this file, and
// releasing it is deferred by a timer. Every test therefore runs on fake timers
// and unmounts and flushes before the next one, so a release scheduled by one
// test can never fire partway through another.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

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

describe('ScreenshotDeterrent screen capture blocking', () => {
  // Settling the native call takes several microtasks: adopting the returned
  // promise, then running the rejection handler that records the failure.
  const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  const renderDeterrent = () =>
    render(<ScreenshotDeterrent enabled isSRP={false} hasNavigation={false} />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks capture once when several protected screens are mounted', () => {
    // Act
    renderDeterrent();
    renderDeterrent();

    // Assert
    expect(PreventScreenshot.forbid).toHaveBeenCalledTimes(1);
  });

  it('keeps capture blocked while another protected screen is still mounted', () => {
    // Arrange
    renderDeterrent();
    const validationScreen = renderDeterrent();

    // Act
    validationScreen.unmount();
    jest.runOnlyPendingTimers();

    // Assert
    expect(PreventScreenshot.allow).not.toHaveBeenCalled();
  });

  it('holds the release until the exit transition has finished', () => {
    // Arrange
    const revealScreen = renderDeterrent();

    // Act
    revealScreen.unmount();

    // Assert
    expect(PreventScreenshot.allow).not.toHaveBeenCalled();

    // Act
    jest.runOnlyPendingTimers();

    // Assert
    expect(PreventScreenshot.allow).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending release when a protected screen mounts mid-transition', () => {
    // Arrange
    const previousScreen = renderDeterrent();

    // Act
    previousScreen.unmount();
    renderDeterrent();
    jest.runOnlyPendingTimers();

    // Assert
    expect(PreventScreenshot.allow).not.toHaveBeenCalled();
  });

  it('stays balanced when enabled is toggled on a mounted screen', () => {
    // Arrange
    const ToggledDeterrent = ({ on }: { on: boolean }) => (
      <ScreenshotDeterrent enabled={on} isSRP={false} hasNavigation={false} />
    );
    const { rerender } = render(<ToggledDeterrent on={false} />);

    // Act
    rerender(<ToggledDeterrent on />);

    // Assert
    expect(PreventScreenshot.forbid).toHaveBeenCalledTimes(1);

    // Act
    rerender(<ToggledDeterrent on={false} />);
    jest.runOnlyPendingTimers();

    // Assert
    expect(PreventScreenshot.allow).toHaveBeenCalledTimes(1);
  });

  it('re-applies the block on the next screen when the native call fails', async () => {
    // Arrange: the first screen leaves the window flag unset, and stays
    // mounted so the block count never returns to zero.
    jest
      .mocked(PreventScreenshot.forbid)
      .mockRejectedValueOnce(new Error('no activity'));
    renderDeterrent();
    await flushMicrotasks();

    // Act
    renderDeterrent();

    // Assert
    expect(PreventScreenshot.forbid).toHaveBeenCalledTimes(2);
  });

  it('does not re-apply the block when it is already in place', async () => {
    // Arrange
    renderDeterrent();
    await flushMicrotasks();

    // Act
    renderDeterrent();

    // Assert
    expect(PreventScreenshot.forbid).toHaveBeenCalledTimes(1);
  });
});
