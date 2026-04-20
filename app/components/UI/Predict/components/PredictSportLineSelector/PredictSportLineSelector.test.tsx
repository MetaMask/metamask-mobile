import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PredictSportLineSelector from './PredictSportLineSelector';
import { PREDICT_SPORT_LINE_SELECTOR_TEST_IDS } from './PredictSportLineSelector.testIds';

const mockWithTiming = jest.fn((v: number) => v);

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const { useRef } = jest.requireActual('react');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => {
      const ref = useRef({ value: v });
      return ref.current;
    },
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: mockWithTiming,
    Easing: { inOut: (fn: unknown) => fn, ease: jest.fn() },
  };
});

jest.mock('@react-native-masked-view/masked-view', () =>
  jest.fn(
    ({
      children,
    }: {
      children?: React.ReactNode;
      maskElement?: React.ReactNode;
    }) => children,
  ),
);

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../../../util/haptics', () => ({
  playSelection: jest.fn(),
}));

const TEST_ID = 'line-selector';
const IDS = PREDICT_SPORT_LINE_SELECTOR_TEST_IDS;

const arrowLeftId = `${TEST_ID}-${IDS.ARROW_LEFT}`;
const arrowRightId = `${TEST_ID}-${IDS.ARROW_RIGHT}`;
const lineId = (value: number) => `${TEST_ID}-${IDS.LINE_PREFIX}${value}`;

describe('PredictSportLineSelector', () => {
  const defaultProps = {
    lines: [4, 4.5, 5, 5.5, 6],
    selectedLine: 5,
    onSelectLine: jest.fn(),
    testID: TEST_ID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all lines', () => {
    const { getByText } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    defaultProps.lines.forEach((line) => {
      expect(getByText(String(line))).toBeOnTheScreen();
    });
  });

  it('applies different color to selected vs unselected lines', () => {
    const { getByText } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    const selectedStyle = getByText('5').props.style;
    const unselectedStyle = getByText('4').props.style;

    expect(selectedStyle).not.toEqual(unselectedStyle);
  });

  it('calls onSelectLine with correct value when a line is tapped', () => {
    const { getByText } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    fireEvent.press(getByText('4.5'));

    expect(defaultProps.onSelectLine).toHaveBeenCalledWith(4.5);
  });

  it('calls onSelectLine with previous line when left arrow is tapped', () => {
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    fireEvent.press(getByTestId(arrowLeftId));

    expect(defaultProps.onSelectLine).toHaveBeenCalledWith(4.5);
  });

  it('calls onSelectLine with next line when right arrow is tapped', () => {
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    fireEvent.press(getByTestId(arrowRightId));

    expect(defaultProps.onSelectLine).toHaveBeenCalledWith(5.5);
  });

  it('disables left arrow when first line is selected', () => {
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} selectedLine={4} />,
    );

    const leftArrow = getByTestId(arrowLeftId);
    expect(leftArrow.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(leftArrow);
    expect(defaultProps.onSelectLine).not.toHaveBeenCalled();
  });

  it('disables right arrow when last line is selected', () => {
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} selectedLine={6} />,
    );

    const rightArrow = getByTestId(arrowRightId);
    expect(rightArrow.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(rightArrow);
    expect(defaultProps.onSelectLine).not.toHaveBeenCalled();
  });

  it('applies test IDs correctly', () => {
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    expect(getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(getByTestId(arrowLeftId)).toBeOnTheScreen();
    expect(getByTestId(arrowRightId)).toBeOnTheScreen();

    defaultProps.lines.forEach((line) => {
      expect(getByTestId(lineId(line))).toBeOnTheScreen();
    });
  });

  it('uses fallback test IDs when testID prop is not provided', () => {
    const { getByTestId } = render(
      <PredictSportLineSelector
        lines={[1, 2, 3]}
        selectedLine={2}
        onSelectLine={jest.fn()}
      />,
    );

    expect(getByTestId(IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(`${IDS.CONTAINER}-${IDS.ARROW_LEFT}`)).toBeOnTheScreen();
    expect(
      getByTestId(`${IDS.CONTAINER}-${IDS.ARROW_RIGHT}`),
    ).toBeOnTheScreen();
  });

  it('displays numbers as-is without formatting', () => {
    const { getByText } = render(
      <PredictSportLineSelector
        {...defaultProps}
        lines={[-2.5, 0, 4.5]}
        selectedLine={0}
      />,
    );

    expect(getByText('-2.5')).toBeOnTheScreen();
    expect(getByText('0')).toBeOnTheScreen();
    expect(getByText('4.5')).toBeOnTheScreen();
  });

  it('invokes onLayout handler without error', () => {
    const { UNSAFE_getAllByType } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    const Box = jest.requireActual('@metamask/design-system-react-native').Box;
    const layoutBox = UNSAFE_getAllByType(Box).find(
      (b: { props: { onLayout?: unknown } }) => b.props.onLayout,
    );

    expect(() => {
      act(() => {
        layoutBox?.props.onLayout({
          nativeEvent: { layout: { width: 300 } },
        });
      });
    }).not.toThrow();
  });

  it('re-renders with a different selectedLine without error', () => {
    const { rerender } = render(<PredictSportLineSelector {...defaultProps} />);

    expect(() => {
      rerender(
        <PredictSportLineSelector {...defaultProps} selectedLine={5.5} />,
      );
    }).not.toThrow();
  });

  it('fires haptic feedback on line tap', () => {
    const { playSelection } = jest.requireMock(
      '../../../../../util/haptics',
    ) as {
      playSelection: jest.Mock;
    };
    const { getByText } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    fireEvent.press(getByText('4.5'));

    expect(playSelection).toHaveBeenCalled();
  });

  it('fires haptic feedback on arrow tap', () => {
    const { playSelection } = jest.requireMock(
      '../../../../../util/haptics',
    ) as {
      playSelection: jest.Mock;
    };
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    fireEvent.press(getByTestId(arrowRightId));

    expect(playSelection).toHaveBeenCalled();
  });

  it('does not call onSelectLine when selectedLine is not in lines', () => {
    const onSelectLine = jest.fn();
    const { getByTestId } = render(
      <PredictSportLineSelector
        lines={[4, 4.5, 5]}
        selectedLine={999}
        onSelectLine={onSelectLine}
        testID={TEST_ID}
      />,
    );

    const leftArrow = getByTestId(arrowLeftId);
    expect(leftArrow.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(leftArrow);

    expect(onSelectLine).not.toHaveBeenCalled();
  });
});
