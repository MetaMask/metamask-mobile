import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  type ReactElement,
} from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { ActivitySlot, type ActivitySlotProps } from './ActivitySlot';
import {
  ActivityScrollProvider,
  useActivityScrollHost,
} from './ActivityScrollHost';

export const ActivityScrollView = forwardRef<ScrollView, ScrollViewProps>(
  (
    {
      children,
      onScroll,
      onLayout,
      scrollEventThrottle,
      stickyHeaderIndices,
      ...rest
    },
    ref,
  ) => {
    const { registry, contentRef, reportScroll } = useActivityScrollHost();

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        reportScroll(
          event.nativeEvent.contentOffset.y,
          event.nativeEvent.layoutMeasurement.height,
        );
        if (typeof onScroll === 'function') {
          onScroll(event);
        }
      },
      [onScroll, reportScroll],
    );

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        registry.setViewportHeight(event.nativeEvent.layout.height);
        if (typeof onLayout === 'function') {
          onLayout(event);
        }
      },
      [onLayout, registry],
    );

    const content = Children.map(children, (child, index) => {
      if (!isValidElement(child) || child.type !== ActivitySlot) {
        return child;
      }
      return cloneElement(child as ReactElement<ActivitySlotProps>, {
        stickyHeader: stickyHeaderIndices?.includes(index) ?? false,
      });
    });

    return (
      <ActivityScrollProvider registry={registry} contentRef={contentRef}>
        <ScrollView
          {...rest}
          ref={ref}
          innerViewRef={contentRef}
          stickyHeaderIndices={stickyHeaderIndices}
          onLayout={handleLayout}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle ?? 16}
        >
          {content}
        </ScrollView>
      </ActivityScrollProvider>
    );
  },
);

ActivityScrollView.displayName = 'ActivityScrollView';
