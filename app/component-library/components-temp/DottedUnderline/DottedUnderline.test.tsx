import React from 'react';
import { LayoutChangeEvent } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import { mockTheme } from '../../../util/theme';
import DottedUnderline from './DottedUnderline';

const TEST_ID = 'dotted-underline';
const UNDERLINE_COLOR = mockTheme.colors.success.default;

const layoutEvent = (width: number) =>
  ({
    nativeEvent: {
      layout: { width, height: 24, x: 0, y: 0 },
    },
  }) as LayoutChangeEvent;

describe('DottedUnderline', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <DottedUnderline color={UNDERLINE_COLOR}>
        <Text>4% APY</Text>
      </DottedUnderline>,
    );

    expect(getByText('4% APY')).toBeOnTheScreen();
  });

  it('renders the underline after content width is measured', () => {
    const { getByTestId, queryByTestId } = render(
      <DottedUnderline color={UNDERLINE_COLOR} testID={TEST_ID}>
        <Text>4% APY</Text>
      </DottedUnderline>,
    );

    expect(queryByTestId(`${TEST_ID}-underline`)).toBeNull();

    fireEvent(getByTestId(TEST_ID), 'layout', layoutEvent(80));

    expect(getByTestId(`${TEST_ID}-underline`)).toBeOnTheScreen();
  });

  it('keeps the underline hidden when content width is zero', () => {
    const { getByTestId, queryByTestId } = render(
      <DottedUnderline color={UNDERLINE_COLOR} testID={TEST_ID}>
        <Text>4% APY</Text>
      </DottedUnderline>,
    );

    fireEvent(getByTestId(TEST_ID), 'layout', layoutEvent(0));

    expect(queryByTestId(`${TEST_ID}-underline`)).toBeNull();
  });
});
