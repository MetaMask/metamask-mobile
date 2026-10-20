import React, { createRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getHardwareTier } from '../../util/deviceCapability';
import {
  ActivityScrollView,
  ActivitySlot,
  useActivityPhase,
  useActivityState,
} from './index';

jest.mock('../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'LOW'),
}));

function createPhaseProbe(renders: { count: number }) {
  return function PhaseProbe({ testID }: { testID: string }) {
    renders.count += 1;
    const phase = useActivityPhase();
    return <Text testID={testID}>{phase}</Text>;
  };
}

function PhaseOnly() {
  useActivityPhase();
  return null;
}

function scrollContent(y: number) {
  fireEvent.scroll(screen.getByTestId('activity-scroll'), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 320, height: 2000 },
      layoutMeasurement: { width: 320, height: 100 },
    },
  });
}

describe('ActivityScrollView', () => {
  beforeEach(() => {
    jest.mocked(getHardwareTier).mockReturnValue('LOW');
  });

  it('forwards scroll props, composes onScroll, and defaults scrollEventThrottle to 16', () => {
    const onScroll = jest.fn();

    render(
      <ActivityScrollView
        testID="activity-scroll"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
      >
        <ActivitySlot id="chart" estimatedHeight={80}>
          <Text>chart</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 0, y: 4 },
        contentSize: { width: 320, height: 800 },
        layoutMeasurement: { width: 320, height: 100 },
      },
    });

    expect(scrollView.props.keyboardDismissMode).toBe('on-drag');
    expect(scrollView.props.scrollEventThrottle).toBe(16);
    expect(onScroll).toHaveBeenCalledTimes(1);
  });

  it('keeps a caller scrollEventThrottle', () => {
    render(
      <ActivityScrollView testID="activity-scroll" scrollEventThrottle={32}>
        <View />
      </ActivityScrollView>,
    );

    expect(screen.UNSAFE_getByType(ScrollView).props.scrollEventThrottle).toBe(
      32,
    );
  });

  it('keeps stickyHeaderIndices aligned to the scroll children', () => {
    render(
      <ActivityScrollView testID="activity-scroll" stickyHeaderIndices={[0]}>
        <View testID="sticky-header" />
        <ActivitySlot id="chart" estimatedHeight={80}>
          <Text>chart</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );
    const scrollView = screen.UNSAFE_getByType(ScrollView);

    expect(scrollView.props.stickyHeaderIndices).toEqual([0]);
    expect(screen.getByTestId('sticky-header')).toBeOnTheScreen();
    expect(screen.getByText('chart')).toBeOnTheScreen();
  });

  it('warns and keeps a sticky-index slot mounted', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    jest.mocked(getHardwareTier).mockReturnValue('LOW');

    render(
      <ActivityScrollView testID="activity-scroll" stickyHeaderIndices={[1]}>
        <ActivitySlot id="top" estimatedHeight={400}>
          <Text>top section</Text>
        </ActivitySlot>
        <ActivitySlot id="sticky-chart" estimatedHeight={300}>
          <Text>sticky chart</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );
    fireEvent(screen.getByTestId('activity-scroll'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } },
    });

    expect(warn).toHaveBeenCalledWith(
      'ActivitySlot id "sticky-chart" is listed in stickyHeaderIndices and stays mounted.',
    );
    expect(screen.getByText('sticky chart')).toBeOnTheScreen();

    warn.mockRestore();
  });

  it('warns and keeps a duplicate id mounted', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="chart" estimatedHeight={1000}>
          <Text>first chart</Text>
        </ActivitySlot>
        <ActivitySlot id="chart" estimatedHeight={40}>
          <Text>duplicate chart</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );

    expect(warn).toHaveBeenCalledWith(
      'ActivitySlot id "chart" is duplicated. The first registration wins.',
    );
    expect(screen.getByText('duplicate chart')).toBeOnTheScreen();

    warn.mockRestore();
  });

  it('does not update a slot whose phase stays the same and updates the slot whose phase changes', () => {
    jest.mocked(getHardwareTier).mockReturnValue('HIGH');
    const topRenders = { count: 0 };
    const belowRenders = { count: 0 };
    const TopProbe = createPhaseProbe(topRenders);
    const BelowProbe = createPhaseProbe(belowRenders);

    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="top" estimatedHeight={100}>
          <TopProbe testID="top-phase" />
        </ActivitySlot>
        <ActivitySlot id="below" estimatedHeight={100}>
          <BelowProbe testID="below-phase" />
        </ActivitySlot>
      </ActivityScrollView>,
    );
    fireEvent(screen.getByTestId('activity-scroll'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } },
    });
    const belowAfterLayout = belowRenders.count;
    scrollContent(-1);

    expect(belowRenders.count).toBe(belowAfterLayout);
    expect(topRenders.count).toBeGreaterThan(0);

    const belowBeforeJump = belowRenders.count;
    scrollContent(250);

    expect(belowRenders.count).toBe(belowBeforeJump);
    expect(screen.queryByTestId('top-phase')).toBeNull();
    expect(
      screen.getByTestId('activity-slot-placeholder-top'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('below-phase')).toHaveTextContent('paused');
  });

  it('reads the hardware tier once for the mounted provider', () => {
    jest.mocked(getHardwareTier).mockClear();
    const view = render(
      <ActivityScrollView testID="activity-scroll">
        <View />
      </ActivityScrollView>,
    );
    view.rerender(
      <ActivityScrollView testID="activity-scroll">
        <View />
      </ActivityScrollView>,
    );

    expect(getHardwareTier).toHaveBeenCalledTimes(1);
  });

  it('forwards a ref to the scroll view', () => {
    const ref = createRef<ScrollView>();

    render(
      <ActivityScrollView ref={ref} testID="activity-scroll">
        <View />
      </ActivityScrollView>,
    );

    expect(ref.current).toBeTruthy();
  });

  it('throws when useActivityPhase has no provider', () => {
    expect(() => render(<PhaseOnly />)).toThrow(
      'useActivityPhase must be used within ActivityScrollView',
    );
  });

  it('throws when useActivityPhase has no slot', () => {
    expect(() =>
      render(
        <ActivityScrollView>
          <PhaseOnly />
        </ActivityScrollView>,
      ),
    ).toThrow('useActivityPhase must be used within ActivitySlot');
  });

  it('throws when ActivitySlot has no provider', () => {
    expect(() =>
      render(
        <ActivitySlot id="chart" estimatedHeight={10}>
          <Text>chart</Text>
        </ActivitySlot>,
      ),
    ).toThrow('ActivitySlot must be used within ActivityScrollView');
  });

  it('keeps duplicate slot state out of the first registration', () => {
    function Mark({ label }: { label: string }) {
      const [value, setValue] = useActivityState('period', '1h');
      return (
        <>
          <Text testID={`${label}-value`}>{value}</Text>
          <PressableMark
            label={label}
            onPress={() => setValue(`${label}-set`)}
          />
        </>
      );
    }

    function PressableMark({
      label,
      onPress,
    }: {
      label: string;
      onPress: () => void;
    }) {
      return <Text testID={`${label}-set`} onPress={onPress} />;
    }

    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="chart" estimatedHeight={40}>
          <Mark label="first" />
        </ActivitySlot>
        <ActivitySlot id="chart" estimatedHeight={40}>
          <Mark label="second" />
        </ActivitySlot>
      </ActivityScrollView>,
    );
    fireEvent.press(screen.getByTestId('second-set'));

    expect(screen.getByTestId('first-value')).toHaveTextContent('1h');
    expect(screen.getByTestId('second-value')).toHaveTextContent('second-set');

    warn.mockRestore();
  });
});
