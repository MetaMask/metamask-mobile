import { act, renderHook } from '@testing-library/react-native';
import React, { createRef } from 'react';
import { View } from 'react-native';
import { HomepageScrollContext } from '../context/HomepageScrollContext';
import useSectionViewportVisible from './useSectionViewportVisible';

const mockUnsubscribeFromScroll = jest.fn();
const mockSubscribeToScroll = jest.fn(() => mockUnsubscribeFromScroll);

const createWrapper =
  (
    contextOverrides: Partial<
      React.ContextType<typeof HomepageScrollContext>
    > = {},
  ) =>
  ({ children }: { children: React.ReactNode }) => (
    <HomepageScrollContext.Provider
      value={{
        subscribeToScroll: mockSubscribeToScroll,
        viewportHeight: 800,
        containerScreenY: 100,
        entryPoint: 'home_tab',
        visitId: 1,
        notifySectionViewed: jest.fn(),
        getViewedSectionCount: () => 0,
        getVisitMaxDepth: () => -1,
        appSessionId: 'session-1',
        ...contextOverrides,
      }}
    >
      {children}
    </HomepageScrollContext.Provider>
  );

describe('useSectionViewportVisible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isVisible false while loading', () => {
    const sectionRef = createRef<View>();
    const { result } = renderHook(
      () => useSectionViewportVisible(sectionRef, { isLoading: true }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isVisible).toBe(false);
  });

  it('sets isVisible true when at least 30% of the section is in the viewport', () => {
    const sectionRef = createRef<View>();
    const measureInWindow = jest.fn(
      (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => {
        callback(0, 150, 100, 200);
      },
    );
    sectionRef.current = { measureInWindow } as unknown as View;

    const { result } = renderHook(
      () => useSectionViewportVisible(sectionRef, { isLoading: false }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('sets isVisible false when the section is off-screen', () => {
    const sectionRef = createRef<View>();
    const measureInWindow = jest.fn(
      (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => {
        callback(0, 1200, 100, 200);
      },
    );
    sectionRef.current = { measureInWindow } as unknown as View;

    const { result } = renderHook(
      () => useSectionViewportVisible(sectionRef, { isLoading: false }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('clears visibility when a visible section collapses to zero height', () => {
    const sectionRef = createRef<View>();
    let sectionHeight = 200;
    const measureInWindow = jest.fn(
      (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => {
        callback(0, 150, 100, sectionHeight);
      },
    );
    sectionRef.current = { measureInWindow } as unknown as View;
    const { result } = renderHook(
      () => useSectionViewportVisible(sectionRef, { isLoading: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.isVisible).toBe(true);
    sectionHeight = 0;

    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('subscribes to homepage scroll events', () => {
    const sectionRef = createRef<View>();
    sectionRef.current = {
      measureInWindow: jest.fn(
        (
          callback: (
            x: number,
            y: number,
            width: number,
            height: number,
          ) => void,
        ) => {
          callback(0, 150, 100, 200);
        },
      ),
    } as unknown as View;

    renderHook(
      () => useSectionViewportVisible(sectionRef, { isLoading: false }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(mockSubscribeToScroll).toHaveBeenCalled();
  });

  it('stops measuring after first visibility when once is enabled', () => {
    const sectionRef = createRef<View>();
    let sectionY = 1200;
    const measureInWindow = jest.fn(
      (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => {
        callback(0, sectionY, 100, 200);
      },
    );
    sectionRef.current = { measureInWindow } as unknown as View;
    const { result } = renderHook(
      () =>
        useSectionViewportVisible(sectionRef, {
          isLoading: false,
          once: true,
        }),
      { wrapper: createWrapper() },
    );
    const scrollCallback = (
      mockSubscribeToScroll.mock.calls as unknown as [[() => void]]
    )[0][0];
    sectionY = 150;

    act(() => {
      scrollCallback();
    });
    measureInWindow.mockClear();
    act(() => {
      scrollCallback();
    });

    expect(result.current.isVisible).toBe(true);
    expect(mockUnsubscribeFromScroll).toHaveBeenCalledTimes(1);
    expect(measureInWindow).not.toHaveBeenCalled();
  });

  it('ignores stale measurements after one-shot visibility is reached', () => {
    type MeasurementCallback = (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => void;
    const sectionRef = createRef<View>();
    const pendingMeasurements: MeasurementCallback[] = [];
    const measureInWindow = jest.fn((callback: MeasurementCallback) => {
      pendingMeasurements.push(callback);
    });
    sectionRef.current = { measureInWindow } as unknown as View;
    const { result } = renderHook(
      () =>
        useSectionViewportVisible(sectionRef, {
          isLoading: false,
          once: true,
        }),
      { wrapper: createWrapper() },
    );
    const scrollCallback = (
      mockSubscribeToScroll.mock.calls as unknown as [[() => void]]
    )[0][0];
    act(() => {
      scrollCallback();
    });
    const [staleMeasurement, visibleMeasurement] = pendingMeasurements as [
      MeasurementCallback,
      MeasurementCallback,
    ];

    act(() => {
      visibleMeasurement(0, 150, 100, 200);
      staleMeasurement(0, 1200, 100, 200);
    });
    measureInWindow.mockClear();
    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isVisible).toBe(true);
    expect(mockUnsubscribeFromScroll).toHaveBeenCalledTimes(1);
    expect(measureInWindow).not.toHaveBeenCalled();
  });

  it('re-measures visibility when visitId increments on homepage revisit', () => {
    const sectionRef = createRef<View>();
    const measureInWindow = jest.fn(
      (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => {
        callback(0, 150, 100, 200);
      },
    );
    sectionRef.current = { measureInWindow } as unknown as View;

    const visitIdRef = { current: 1 };
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createWrapper({ visitId: visitIdRef.current })({ children });

    const { result, rerender } = renderHook(
      ({ visitId: _visitId }: { visitId: number }) =>
        useSectionViewportVisible(sectionRef, { isLoading: false }),
      {
        wrapper,
        initialProps: { visitId: 1 },
      },
    );

    act(() => {
      result.current.onLayout();
    });

    expect(result.current.isVisible).toBe(true);
    measureInWindow.mockClear();

    visitIdRef.current = 2;
    rerender({ visitId: 2 });

    expect(measureInWindow).toHaveBeenCalled();
    expect(result.current.isVisible).toBe(true);
  });
});
