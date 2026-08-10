import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import MoneySheetEntrance from './MoneySheetEntrance';
import { useReduceMotionState } from '../../hooks/useReduceMotion';
import { MONEY_SHEET_ENTRANCE_TRANSLATE_Y } from '../../constants/sheetEntrance';

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(),
}));

const mockUseReduceMotionState = useReduceMotionState as jest.Mock;

const STEP_TEST_ID = 'entrance-step';
const CHILD_TEST_ID = 'entrance-child';

const styles = StyleSheet.create({ fullWidth: { width: '100%' } });

const getStyle = (node: { props: { style?: unknown } }) => {
  const { style } = node.props;
  return Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : ((style ?? {}) as Record<string, unknown>);
};

/**
 * The phase decision itself is covered exhaustively against
 * `resolveMoneySheetEntrancePhase` in `constants/sheetEntrance.test.ts`.
 * Reanimated's jest mock evaluates the style worklet once per render and does
 * not re-render on shared-value writes, so these cover only what the component
 * itself owns: layout stability, the resting state, and style composition.
 */
describe('MoneySheetEntrance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReduceMotionState.mockReturnValue(false);
  });

  it('keeps the children mounted while held so the sheet height never shifts', () => {
    const { getByTestId } = render(
      <MoneySheetEntrance isActive={false} testID={STEP_TEST_ID}>
        <Text testID={CHILD_TEST_ID}>Spend and earn</Text>
      </MoneySheetEntrance>,
    );

    expect(getByTestId(CHILD_TEST_ID)).toBeOnTheScreen();
  });

  it('starts hidden and offset so the step can rise into place', () => {
    const { getByTestId } = render(
      <MoneySheetEntrance isActive={false} testID={STEP_TEST_ID}>
        <Text testID={CHILD_TEST_ID}>Spend and earn</Text>
      </MoneySheetEntrance>,
    );

    const style = getStyle(getByTestId(STEP_TEST_ID));
    expect(style.opacity).toBe(0);
    expect(style.transform).toEqual([
      { translateY: MONEY_SHEET_ENTRANCE_TRANSLATE_Y },
    ]);
  });

  it('applies the caller style alongside the animated style', () => {
    const { getByTestId } = render(
      <MoneySheetEntrance
        isActive={false}
        style={styles.fullWidth}
        testID={STEP_TEST_ID}
      >
        <Text testID={CHILD_TEST_ID}>Spend and earn</Text>
      </MoneySheetEntrance>,
    );

    expect(getStyle(getByTestId(STEP_TEST_ID)).width).toBe('100%');
  });
});
