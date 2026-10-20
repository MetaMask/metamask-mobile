import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getHardwareTier } from '../../util/deviceCapability';
import { ActivityScrollView, ActivitySlot, useActivityPhase } from './index';

jest.mock('../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'LOW'),
}));

function PhaseLabel({ testID }: { testID: string }) {
  const phase = useActivityPhase();
  return <Text testID={testID}>{phase}</Text>;
}

function layoutViewport(height: number) {
  fireEvent(screen.getByTestId('activity-scroll'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height } },
  });
}

function attachContentHost() {
  const scroll = screen.UNSAFE_getByType(ScrollView);
  scroll.props.innerViewRef.current = {};
}

describe('ActivitySlot', () => {
  beforeEach(() => {
    jest.mocked(getHardwareTier).mockReturnValue('LOW');
  });

  it('leaves below-fold children unmounted on the first render when the position estimate is valid', () => {
    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="top" estimatedHeight={100}>
          <Text>top section</Text>
        </ActivitySlot>
        <ActivitySlot id="below" estimatedHeight={400}>
          <Text>below section</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );

    expect(screen.getByText('top section')).toBeOnTheScreen();
    expect(screen.queryByText('below section')).toBeNull();
    expect(screen.getByTestId('activity-slot-placeholder-below')).toHaveStyle({
      height: 400,
    });
  });

  it('keeps a paused slot mounted', () => {
    jest.mocked(getHardwareTier).mockReturnValue('MID');

    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="top" estimatedHeight={200}>
          <PhaseLabel testID="top-phase" />
        </ActivitySlot>
        <ActivitySlot id="near" estimatedHeight={50}>
          <PhaseLabel testID="near-phase" />
        </ActivitySlot>
      </ActivityScrollView>,
    );
    layoutViewport(200);

    expect(screen.getByTestId('near-phase')).toHaveTextContent('paused');
    expect(screen.getByTestId('activity-slot-near')).toBeOnTheScreen();
  });

  it('unmounts dormant children and keeps the last measured height', () => {
    const measureLayout = jest
      .spyOn(View.prototype, 'measureLayout')
      .mockImplementation((_relative, onSuccess) => {
        onSuccess(0, 0, 320, 180);
      });

    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="chart" estimatedHeight={100}>
          <Text>chart</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );
    layoutViewport(100);
    attachContentHost();
    fireEvent(screen.getByTestId('activity-slot-chart'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } },
    });
    fireEvent.scroll(screen.getByTestId('activity-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 250 },
        contentSize: { width: 320, height: 400 },
        layoutMeasurement: { width: 320, height: 100 },
      },
    });

    expect(screen.queryByText('chart')).toBeNull();
    expect(screen.getByTestId('activity-slot-placeholder-chart')).toHaveStyle({
      height: 180,
    });

    measureLayout.mockRestore();
  });

  it('keeps the last height when measurement fails', () => {
    const measureLayout = jest
      .spyOn(View.prototype, 'measureLayout')
      .mockImplementationOnce((_relative, onSuccess) => {
        onSuccess(0, 0, 320, 180);
      })
      .mockImplementation((_relative, _onSuccess, onFail) => {
        onFail?.();
      });

    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="chart" estimatedHeight={100}>
          <Text>chart</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );
    layoutViewport(100);
    attachContentHost();
    fireEvent(screen.getByTestId('activity-slot-chart'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } },
    });
    fireEvent(screen.getByTestId('activity-slot-chart'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } },
    });
    fireEvent.scroll(screen.getByTestId('activity-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 250 },
        contentSize: { width: 320, height: 400 },
        layoutMeasurement: { width: 320, height: 100 },
      },
    });

    expect(screen.getByTestId('activity-slot-placeholder-chart')).toHaveStyle({
      height: 180,
    });

    measureLayout.mockRestore();
  });

  it('keeps a slot mounted when it has no estimatedHeight', () => {
    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="top" estimatedHeight={80}>
          <Text>top section</Text>
        </ActivitySlot>
        <ActivitySlot id="unknown">
          <Text>unknown section</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );

    expect(screen.getByText('unknown section')).toBeOnTheScreen();
  });

  it('keeps a slot mounted until an unmeasured slot above it has a height', () => {
    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="gap">
          <Text>gap section</Text>
        </ActivitySlot>
        <ActivitySlot id="after" estimatedHeight={80}>
          <Text>after section</Text>
        </ActivitySlot>
      </ActivityScrollView>,
    );

    expect(screen.getByText('after section')).toBeOnTheScreen();
    expect(screen.queryByTestId('activity-slot-placeholder-after')).toBeNull();
  });

  it('passes the current phase to a render function', () => {
    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="chart" estimatedHeight={120}>
          {({ phase }) => <Text>{`phase-${phase}`}</Text>}
        </ActivitySlot>
      </ActivityScrollView>,
    );

    expect(screen.getByText('phase-active')).toBeOnTheScreen();
  });
});
