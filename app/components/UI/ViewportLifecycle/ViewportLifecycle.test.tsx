import React, { type RefObject } from 'react';
import { Text, View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import ViewportLifecycle from './ViewportLifecycle';
import {
  ScrollViewportProvider,
  type ViewportPublisher,
} from './ScrollViewportContext';

function createPublishRef() {
  return { current: null } as RefObject<ViewportPublisher | null>;
}

describe('ViewportLifecycle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no scroll provider exists', () => {
    render(
      <ViewportLifecycle>
        <Text>chart</Text>
      </ViewportLifecycle>,
    );

    expect(screen.getByText('chart')).toBeOnTheScreen();
  });

  it('calls onHidden and unmounts after a far measurement', () => {
    jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation((callback) => {
        callback(0, 4000, 100, 200);
      });
    const publishRef = createPublishRef();
    const onHidden = jest.fn();
    const onVisible = jest.fn();

    render(
      <ScrollViewportProvider publishRef={publishRef}>
        <ViewportLifecycle
          mode="unmount-when-far"
          onHidden={onHidden}
          onVisible={onVisible}
        >
          <Text>chart</Text>
        </ViewportLifecycle>
      </ScrollViewportProvider>,
    );

    act(() => {
      publishRef.current?.publishBounds({ top: 0, height: 800 });
    });

    expect(screen.queryByText('chart')).toBeNull();
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onVisible).not.toHaveBeenCalled();
  });

  it('calls onVisible only on the hidden to visible transition', () => {
    const measure = jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation((callback) => {
        callback(0, 4000, 100, 200);
      });
    const publishRef = createPublishRef();
    const onVisible = jest.fn();

    render(
      <ScrollViewportProvider publishRef={publishRef}>
        <ViewportLifecycle mode="observe" onVisible={onVisible}>
          <Text>chart</Text>
        </ViewportLifecycle>
      </ScrollViewportProvider>,
    );

    act(() => {
      publishRef.current?.publishBounds({ top: 0, height: 800 });
    });

    measure.mockImplementation((callback) => {
      callback(0, 100, 100, 200);
    });

    act(() => {
      publishRef.current?.publishBounds({ top: 0, height: 800 });
      publishRef.current?.publishBounds({ top: 0, height: 800 });
    });

    expect(screen.getByText('chart')).toBeOnTheScreen();
    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('mounts a below-fold section when its own layout lands inside the preload margin', () => {
    const measure = jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation((callback) => {
        callback(0, 0, 0, 0);
      });
    const publishRef = createPublishRef();

    render(
      <ScrollViewportProvider publishRef={publishRef}>
        <ViewportLifecycle
          mode="unmount-when-far"
          initiallyMounted={false}
          preloadMargin={400}
          placeholderHeight={280}
        >
          <Text>below</Text>
        </ViewportLifecycle>
      </ScrollViewportProvider>,
    );

    act(() => {
      publishRef.current?.publishBounds({ top: 0, height: 800 });
    });
    expect(screen.queryByText('below')).toBeNull();

    measure.mockImplementation((callback) => {
      callback(0, 1000, 390, 280);
    });
    const [placeholder] = screen.UNSAFE_getAllByType(View);
    expect(placeholder.props.style).toEqual({ height: 280 });
    act(() => {
      placeholder.props.onLayout({
        nativeEvent: { layout: { x: 0, y: 1000, width: 390, height: 280 } },
      });
    });

    expect(screen.getByText('below')).toBeOnTheScreen();
  });

  it('checks the last published bounds when a section mounts after the publish', () => {
    jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation((callback) => {
        callback(0, 100, 390, 200);
      });
    const publishRef = createPublishRef();
    const LateSection = ({ show }: { show: boolean }) => (
      <ScrollViewportProvider publishRef={publishRef}>
        {show ? (
          <ViewportLifecycle mode="unmount-when-far" initiallyMounted={false}>
            <Text>late</Text>
          </ViewportLifecycle>
        ) : null}
      </ScrollViewportProvider>
    );
    const { rerender } = render(<LateSection show={false} />);
    act(() => {
      publishRef.current?.publishBounds({ top: 0, height: 800 });
    });

    rerender(<LateSection show />);

    expect(screen.getByText('late')).toBeOnTheScreen();
  });

  it('keeps below-fold children unmounted until they intersect', () => {
    jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation((callback) => {
        callback(0, 4000, 100, 200);
      });
    const publishRef = createPublishRef();

    render(
      <ScrollViewportProvider publishRef={publishRef}>
        <ViewportLifecycle mode="unmount-when-far" initiallyMounted={false}>
          <Text>below</Text>
        </ViewportLifecycle>
      </ScrollViewportProvider>,
    );

    expect(screen.queryByText('below')).toBeNull();

    act(() => {
      publishRef.current?.publishBounds({ top: 0, height: 800 });
    });

    expect(screen.queryByText('below')).toBeNull();
  });
});
