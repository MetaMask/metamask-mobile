import React from 'react';
import { Platform, View } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import ToasterOverlay from './ToasterOverlay';
import {
  TOAST_OVERLAY_ANIMATION_BUFFER_MS,
  TOAST_OVERLAY_AUTO_DISMISS_MS,
  TOASTER_FULL_WINDOW_OVERLAY_TEST_ID,
} from './ToasterOverlay.constants';

interface ToasterRef {
  showToast: (options: { title?: string; hasNoTimeout?: boolean }) => void;
  closeToast: () => void;
}

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockOverlayTestId = 'toaster-full-window-overlay';
let latestToasterRef: { current: ToasterRef | null } | null = null;

jest.mock('react-native-screens', () => {
  const { View: MockView } = jest.requireActual<{
    View: typeof View;
  }>('react-native');

  return {
    FullWindowOverlay: ({
      children,
      unstable_accessibilityContainerViewIsModal,
    }: {
      children: React.ReactNode;
      unstable_accessibilityContainerViewIsModal?: boolean;
    }) => (
      <MockView
        testID={mockOverlayTestId}
        accessibilityContainerViewIsModal={
          unstable_accessibilityContainerViewIsModal
        }
      >
        {children}
      </MockView>
    ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactMock = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<{
    View: typeof View;
  }>('react-native');

  const MockToaster = ReactMock.forwardRef<ToasterRef, Record<string, never>>(
    (_props, ref) => {
      const api: ToasterRef = {
        showToast: (...args) => mockShowToast(...args),
        closeToast: (...args) => mockCloseToast(...args),
      };

      ReactMock.useImperativeHandle(ref, () => api);
      ReactMock.useLayoutEffect(() => {
        if (ref && typeof ref !== 'function') {
          latestToasterRef = ref;
        }
      });

      return <MockView testID="toaster" />;
    },
  );
  MockToaster.displayName = 'MockToaster';

  return {
    Toaster: MockToaster,
  };
});

describe('ToasterOverlay', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    latestToasterRef = null;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalPlatform,
    });
  });

  it('does not mount FullWindowOverlay while idle on iOS', () => {
    const { queryByTestId, getByTestId } = render(<ToasterOverlay />);

    expect(getByTestId('toaster')).toBeOnTheScreen();
    expect(queryByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID)).toBeNull();
  });

  it('mounts FullWindowOverlay when showToast is called on iOS', async () => {
    const { getByTestId, queryByTestId } = render(<ToasterOverlay />);

    expect(queryByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID)).toBeNull();

    act(() => {
      latestToasterRef?.current?.showToast({ title: 'Copied' });
    });

    await waitFor(() => {
      expect(
        getByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID),
      ).toBeOnTheScreen();
    });
    expect(getByTestId('toaster')).toBeOnTheScreen();
    expect(mockShowToast).toHaveBeenCalledWith({ title: 'Copied' });
  });

  it('sets accessibilityContainerViewIsModal to false on the overlay', async () => {
    const { getByTestId } = render(<ToasterOverlay />);

    act(() => {
      latestToasterRef?.current?.showToast({ title: 'Copied' });
    });

    await waitFor(() => {
      expect(
        getByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID),
      ).toBeOnTheScreen();
    });

    expect(
      getByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID).props
        .accessibilityContainerViewIsModal,
    ).toBe(false);
  });

  it('unmounts FullWindowOverlay after auto-dismiss timeout', async () => {
    const { getByTestId, queryByTestId } = render(<ToasterOverlay />);

    act(() => {
      latestToasterRef?.current?.showToast({ title: 'Copied' });
    });

    await waitFor(() => {
      expect(
        getByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID),
      ).toBeOnTheScreen();
    });

    act(() => {
      jest.advanceTimersByTime(TOAST_OVERLAY_AUTO_DISMISS_MS);
    });

    await waitFor(() => {
      expect(queryByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID)).toBeNull();
    });
  });

  it('unmounts FullWindowOverlay after closeToast exit buffer', async () => {
    const { getByTestId, queryByTestId } = render(<ToasterOverlay />);

    act(() => {
      latestToasterRef?.current?.showToast({
        title: 'Pinned',
        hasNoTimeout: true,
      });
    });

    await waitFor(() => {
      expect(
        getByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID),
      ).toBeOnTheScreen();
    });

    act(() => {
      latestToasterRef?.current?.closeToast();
    });

    expect(mockCloseToast).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(TOAST_OVERLAY_ANIMATION_BUFFER_MS);
    });

    await waitFor(() => {
      expect(queryByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID)).toBeNull();
    });
  });

  it('does not mount FullWindowOverlay on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });

    const { queryByTestId, getByTestId } = render(<ToasterOverlay />);

    expect(getByTestId('toaster')).toBeOnTheScreen();
    expect(queryByTestId(TOASTER_FULL_WINDOW_OVERLAY_TEST_ID)).toBeNull();
  });
});
