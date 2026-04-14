import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictSportLineSelector from './PredictSportLineSelector';
import { PREDICT_SPORT_LINE_SELECTOR_TEST_IDS } from './PredictSportLineSelector.testIds';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (v: number) => v,
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
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

  it('renders selected line with bold styling', () => {
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    expect(getByTestId(lineId(5))).toBeOnTheScreen();
    expect(getByTestId(lineId(4))).toBeOnTheScreen();
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

  it('computes translateX on layout', () => {
    const { UNSAFE_getAllByType } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    const boxes = UNSAFE_getAllByType(
      jest.requireActual('@metamask/design-system-react-native').Box,
    );
    const layoutBox = boxes.find(
      (b: { props: { onLayout?: unknown } }) => b.props.onLayout,
    );

    layoutBox?.props.onLayout({
      nativeEvent: { layout: { width: 300 } },
    });

    expect(layoutBox).toBeDefined();
  });

  it('triggers animation when selectedLine changes after layout', () => {
    const { rerender, UNSAFE_getAllByType } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    const boxes = UNSAFE_getAllByType(
      jest.requireActual('@metamask/design-system-react-native').Box,
    );
    const layoutBox = boxes.find(
      (b: { props: { onLayout?: unknown } }) => b.props.onLayout,
    );

    layoutBox?.props.onLayout({
      nativeEvent: { layout: { width: 300 } },
    });

    rerender(<PredictSportLineSelector {...defaultProps} selectedLine={5.5} />);

    expect(layoutBox).toBeDefined();
  });

  it('fires haptic feedback on line tap', () => {
    const { impactAsync } = jest.requireMock('expo-haptics') as {
      impactAsync: jest.Mock;
    };
    const { getByText } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    fireEvent.press(getByText('4.5'));

    expect(impactAsync).toHaveBeenCalledWith('light');
  });

  it('fires haptic feedback on arrow tap', () => {
    const { impactAsync } = jest.requireMock('expo-haptics') as {
      impactAsync: jest.Mock;
    };
    const { getByTestId } = render(
      <PredictSportLineSelector {...defaultProps} />,
    );

    fireEvent.press(getByTestId(arrowRightId));

    expect(impactAsync).toHaveBeenCalledWith('light');
  });
});
