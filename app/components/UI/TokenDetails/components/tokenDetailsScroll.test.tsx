import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {
  LOAD_MORE_THRESHOLD_PX,
  TokenDetailsScrollProvider,
  useLoadMoreOnScroll,
  useTokenDetailsScroll,
} from './tokenDetailsScroll';

const scrollEvent = (
  offsetY: number,
  viewportHeight: number,
  contentHeight: number,
) =>
  ({
    nativeEvent: {
      contentOffset: { y: offsetY, x: 0 },
      layoutMeasurement: { height: viewportHeight, width: 400 },
      contentSize: { height: contentHeight, width: 400 },
    },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

const layoutEvent = (height: number) =>
  ({
    nativeEvent: { layout: { height, width: 400, x: 0, y: 0 } },
  }) as LayoutChangeEvent;

/**
 * Renders the publisher and a listener together, the way the screen renders
 * its ScrollView around the tab pages.
 */
const renderPageWithListener = ({
  enabled = true,
  onLoadMore = jest.fn(),
}: { enabled?: boolean; onLoadMore?: jest.Mock } = {}) => {
  const page = renderHook(() => useTokenDetailsScroll());
  const listener = renderHook(
    (props: { enabled: boolean }) =>
      useLoadMoreOnScroll({ enabled: props.enabled, onLoadMore }),
    {
      initialProps: { enabled },
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          TokenDetailsScrollProvider,
          { value: page.result.current.value },
          children,
        ),
    },
  );
  return { page, listener, onLoadMore };
};

describe('useTokenDetailsScroll', () => {
  it('reports nothing before the page has been laid out and measured', () => {
    const { page, onLoadMore } = renderPageWithListener();

    act(() => page.result.current.onScroll(scrollEvent(0, 0, 0)));

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('asks for more once the end of the page is within the threshold', () => {
    const { page, onLoadMore } = renderPageWithListener();

    act(() =>
      // 2000 of content, an 800 viewport scrolled to 1400: 200 left below.
      page.result.current.onScroll(scrollEvent(1400, 800, 2000)),
    );

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('stays quiet while the end of the page is still far below', () => {
    const { page, onLoadMore } = renderPageWithListener();

    act(() => page.result.current.onScroll(scrollEvent(0, 800, 9000)));

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('treats exactly the threshold as near enough', () => {
    const { page, onLoadMore } = renderPageWithListener();

    act(() =>
      page.result.current.onScroll(
        scrollEvent(0, 800, 800 + LOAD_MORE_THRESHOLD_PX),
      ),
    );

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('pages in a first page shorter than the screen, which never scrolls', () => {
    const { page, onLoadMore } = renderPageWithListener();

    act(() => {
      page.result.current.onLayout(layoutEvent(800));
      page.result.current.onContentSizeChange(400, 300);
    });

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('re-reads when an appended page grows the content', () => {
    const { page, onLoadMore } = renderPageWithListener();

    act(() => page.result.current.onScroll(scrollEvent(0, 800, 9000)));
    expect(onLoadMore).not.toHaveBeenCalled();

    act(() => page.result.current.onContentSizeChange(400, 1000));

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('ignores a page that has no listener attached', () => {
    const page = renderHook(() => useTokenDetailsScroll());

    expect(() =>
      act(() => page.result.current.onScroll(scrollEvent(1400, 800, 2000))),
    ).not.toThrow();
  });
});

describe('useLoadMoreOnScroll', () => {
  it('checks the page as soon as it subscribes', () => {
    const page = renderHook(() => useTokenDetailsScroll());
    act(() => page.result.current.onScroll(scrollEvent(1400, 800, 2000)));
    const onLoadMore = jest.fn();

    renderHook(() => useLoadMoreOnScroll({ enabled: true, onLoadMore }), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          TokenDetailsScrollProvider,
          { value: page.result.current.value },
          children,
        ),
    });

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('stays quiet while disabled, then follows the page once enabled', () => {
    const { page, listener, onLoadMore } = renderPageWithListener({
      enabled: false,
    });

    act(() => page.result.current.onScroll(scrollEvent(1400, 800, 2000)));
    expect(onLoadMore).not.toHaveBeenCalled();

    listener.rerender({ enabled: true });

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('stops following the page once it unmounts', () => {
    const { page, listener, onLoadMore } = renderPageWithListener();
    act(() => page.result.current.onScroll(scrollEvent(1400, 800, 2000)));
    const beforeUnmount = onLoadMore.mock.calls.length;

    listener.unmount();
    act(() => page.result.current.onScroll(scrollEvent(1500, 800, 2000)));

    expect(onLoadMore).toHaveBeenCalledTimes(beforeUnmount);
  });

  it('does nothing outside a Token Details page', () => {
    const onLoadMore = jest.fn();

    expect(() =>
      renderHook(() => useLoadMoreOnScroll({ enabled: true, onLoadMore })),
    ).not.toThrow();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
