import React, { createRef } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';
import PositionSheetContainer, {
  type PositionSheetContainerRef,
} from './PositionSheetContainer';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const HEADER_Y = 20;
const CONTENT_TOP = 100;
const CONTENT_Y = 300;

const renderSheet = (): {
  ref: React.RefObject<PositionSheetContainerRef | null>;
  onClosed: jest.Mock;
  onOpened: jest.Mock;
  onDragStart: jest.Mock;
  onDragEnd: jest.Mock;
} => {
  const ref = createRef<PositionSheetContainerRef>();
  const onClosed = jest.fn();
  const onOpened = jest.fn();
  const onDragStart = jest.fn();
  const onDragEnd = jest.fn();
  render(
    <PositionSheetContainer
      ref={ref}
      header={<Text>Header</Text>}
      footer={<Text>Footer</Text>}
      onClosed={onClosed}
      onOpened={onOpened}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Text>Content</Text>
    </PositionSheetContainer>,
  );
  fireEvent(
    screen.getByTestId(PositionDetailsSheetSelectorsIDs.SCROLL),
    'layout',
    {
      nativeEvent: {
        layout: { x: 0, y: CONTENT_TOP, width: 390, height: 900 },
      },
    },
  );
  act(() => jest.runAllTimers());
  return { ref, onClosed, onOpened, onDragStart, onDragEnd };
};

const drag = ({
  y,
  translationY,
  velocityY = 0,
}: {
  y: number;
  translationY: number;
  velocityY?: number;
}): void => {
  act(() => {
    fireGestureHandler(
      getByGestureTestId(PositionDetailsSheetSelectorsIDs.DRAG_GESTURE),
      [
        { state: State.BEGAN, y, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, y, translationY: 12, velocityY },
        { state: State.ACTIVE, y: y + translationY, translationY, velocityY },
        {
          state: State.END,
          y: y + translationY,
          translationY,
          velocityY,
        },
      ],
    );
  });
  act(() => jest.runAllTimers());
};

const scrollListTo = (y: number): void =>
  fireEvent.scroll(
    screen.getByTestId(PositionDetailsSheetSelectorsIDs.SCROLL),
    {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 390, height: 2000 },
        layoutMeasurement: { width: 390, height: 900 },
      },
    },
  );

describe('PositionSheetContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports when the open animation finishes', () => {
    const { onOpened } = renderSheet();

    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it('renders the header, list and pinned footer', () => {
    renderSheet();

    expect(screen.getByText('Header')).toBeOnTheScreen();
    expect(screen.getByText('Content')).toBeOnTheScreen();
    expect(screen.getByText('Footer')).toBeOnTheScreen();
  });

  it('dismisses on a quick flick down from the header', () => {
    const { onClosed } = renderSheet();

    drag({ y: HEADER_Y, translationY: 40, velocityY: 1500 });

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('dismisses when dragged past a quarter of the sheet', () => {
    const { onClosed } = renderSheet();

    drag({ y: HEADER_Y, translationY: 400 });

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('springs back open after a short, slow drag', () => {
    const { onClosed, onDragStart, onDragEnd } = renderSheet();

    drag({ y: HEADER_Y, translationY: 120 });

    expect(onClosed).not.toHaveBeenCalled();
    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('stays open on an upward flick', () => {
    const { onClosed } = renderSheet();

    drag({ y: HEADER_Y, translationY: 400, velocityY: -1500 });

    expect(onClosed).not.toHaveBeenCalled();
  });

  it('dismisses on a flick down the list when it is already at the top', () => {
    const { onClosed } = renderSheet();

    drag({ y: CONTENT_Y, translationY: 40, velocityY: 1500 });

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('only scrolls on a flick down a list that is scrolled', () => {
    const { onClosed } = renderSheet();
    scrollListTo(400);

    drag({ y: CONTENT_Y, translationY: 40, velocityY: 1500 });

    expect(onClosed).not.toHaveBeenCalled();
  });

  it('dismisses from the overlay', () => {
    const { onClosed } = renderSheet();

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.OVERLAY, {
        includeHiddenElements: true,
      }),
    );
    act(() => jest.runAllTimers());

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('runs the close callback after the sheet has closed', () => {
    const { ref, onClosed } = renderSheet();
    const next = jest.fn(() => expect(onClosed).toHaveBeenCalled());

    act(() => ref.current?.close(next));
    act(() => jest.runAllTimers());

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('closes once when dismissed twice', () => {
    const { ref, onClosed } = renderSheet();

    act(() => {
      ref.current?.dismiss();
      ref.current?.dismiss();
    });
    act(() => jest.runAllTimers());

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('fades instead of sliding when reduced motion is on', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { ref, onClosed } = renderSheet();

    act(() => ref.current?.dismiss());
    act(() => jest.runAllTimers());

    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});
