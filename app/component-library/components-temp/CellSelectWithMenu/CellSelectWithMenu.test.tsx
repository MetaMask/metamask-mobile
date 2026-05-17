import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';

import CellSelectWithMenu from './CellSelectWithMenu';
import { CellComponentSelectorsIDs } from '../../components/Cells/Cell/CellComponent.testIds';

import { SAMPLE_CELLSELECT_WITH_BUTTON_PROPS } from './CellSelectWithMenu.constants';

describe('CellSelectWithMenu', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(
      <CellSelectWithMenu {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS} />,
    );
    expect(
      getByTestId(CellComponentSelectorsIDs.MULTISELECT),
    ).toBeOnTheScreen();
  });

  it('calls onTextClick when secondary text is pressed', () => {
    const mockOnTextClick = jest.fn();
    const { getByText } = render(
      <CellSelectWithMenu
        {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS}
        onTextClick={mockOnTextClick}
      />,
    );

    fireEvent.press(
      getByText(SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.secondaryText as string),
    );

    expect(mockOnTextClick).toHaveBeenCalledTimes(1);
  });

  it('does not wrap secondary text in a pressable when onTextClick is not provided', () => {
    const { getByText } = render(
      <CellSelectWithMenu {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS} />,
    );

    const secondaryTextElement = getByText(
      SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.secondaryText as string,
    );

    expect(() => fireEvent.press(secondaryTextElement)).not.toThrow();
    expect(secondaryTextElement.parent?.type).not.toBe(TouchableOpacity);
  });
});
