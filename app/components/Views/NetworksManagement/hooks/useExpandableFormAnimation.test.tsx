import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Easing, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useExpandableFormAnimation } from './useExpandableFormAnimation';

jest.useFakeTimers();
afterAll(() => jest.useRealTimers());

const layoutEvent = (height: number) =>
  ({ nativeEvent: { layout: { height } } }) as unknown as LayoutChangeEvent;

const flush = (ms = 500) => act(() => jest.advanceTimersByTime(ms));

interface HarnessProps {
  expanded: boolean;
  layoutHeight?: number;
  options?: Parameters<typeof useExpandableFormAnimation>[1];
}

function Harness({ expanded, layoutHeight, options }: HarnessProps) {
  const { onContentLayout, contentWrapperStyle, toggleButtonStyle } =
    useExpandableFormAnimation(expanded, options);

  useEffect(() => {
    if (layoutHeight !== undefined) {
      onContentLayout(layoutEvent(layoutHeight));
    }
  }, [layoutHeight, onContentLayout]);

  return (
    <>
      <Animated.View testID="content" style={contentWrapperStyle} />
      <Animated.View testID="toggle" style={toggleButtonStyle} />
    </>
  );
}

const renderHarness = (
  expanded: boolean,
  opts?: {
    layoutHeight?: number;
    animationOptions?: Parameters<typeof useExpandableFormAnimation>[1];
  },
) =>
  render(
    <Harness
      expanded={expanded}
      layoutHeight={opts?.layoutHeight}
      options={opts?.animationOptions}
    />,
  );

describe('useExpandableFormAnimation', () => {
  it('returns the expected API shape', () => {
    renderHarness(false);

    expect(screen.getByTestId('content')).toBeDefined();
    expect(screen.getByTestId('toggle')).toBeDefined();
  });

  it('starts collapsed at height 0, opacity 0', () => {
    renderHarness(false);
    flush();

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 0,
      opacity: 0,
    });
  });

  it('expands to measured height when expanded and layout fires', () => {
    renderHarness(true, { layoutHeight: 300 });
    flush();

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 300,
      opacity: 1,
    });
  });

  it('does not expand on layout when collapsed', () => {
    renderHarness(false, { layoutHeight: 200 });
    flush();

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 0,
    });
  });

  it('ignores zero-height layout events', () => {
    renderHarness(true, { layoutHeight: 0 });
    flush();

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 0,
    });
  });

  it('expands via useEffect when toggled true after layout measured', () => {
    const { rerender } = render(
      <Harness expanded={false} layoutHeight={400} />,
    );

    act(() => rerender(<Harness expanded layoutHeight={400} />));
    flush();

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 400,
      opacity: 1,
    });
  });

  it('collapses when toggled false', () => {
    const { rerender } = render(<Harness expanded layoutHeight={300} />);
    flush();

    act(() => rerender(<Harness expanded={false} layoutHeight={300} />));
    flush();

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 0,
      opacity: 0,
    });
  });

  it('handles expand → collapse → re-expand cycle', () => {
    const { rerender } = render(
      <Harness expanded={false} layoutHeight={250} />,
    );

    act(() => rerender(<Harness expanded layoutHeight={250} />));
    flush();
    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 250,
    });

    act(() => rerender(<Harness expanded={false} layoutHeight={250} />));
    flush();
    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 0,
    });

    act(() => rerender(<Harness expanded layoutHeight={250} />));
    flush();
    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 250,
    });
  });

  it('uses the latest measured height after multiple layouts', () => {
    const { rerender } = render(
      <Harness expanded={false} layoutHeight={200} />,
    );

    act(() => rerender(<Harness expanded={false} layoutHeight={350} />));

    act(() => rerender(<Harness expanded layoutHeight={350} />));
    flush();

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 350,
    });
  });

  it('respects custom duration and easing', () => {
    renderHarness(true, {
      layoutHeight: 200,
      animationOptions: { duration: 100, easing: Easing.linear },
    });
    act(() => jest.advanceTimersByTime(110));

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      height: 200,
      opacity: 1,
    });
  });

  it('sets overflow hidden on both styles', () => {
    renderHarness(false);

    expect(screen.getByTestId('content')).toHaveAnimatedStyle({
      overflow: 'hidden',
    });
    expect(screen.getByTestId('toggle')).toHaveAnimatedStyle({
      overflow: 'hidden',
    });
  });

  it('toggleButtonStyle fades out and shrinks when expanded', () => {
    renderHarness(false);
    flush();

    expect(screen.getByTestId('toggle')).toHaveAnimatedStyle({
      maxHeight: 56,
      opacity: 1,
    });

    renderHarness(true, { layoutHeight: 300 });
    flush();

    expect(screen.getByTestId('toggle')).toHaveAnimatedStyle({
      maxHeight: 0,
      opacity: 0,
    });
  });
});
