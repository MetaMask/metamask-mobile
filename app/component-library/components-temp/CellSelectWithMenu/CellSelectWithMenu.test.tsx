import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';

import CellSelectWithMenu from './CellSelectWithMenu';
import { CellComponentSelectorsIDs } from '../../../../e2e/selectors/wallet/CellComponent.selectors';

import { SAMPLE_CELLSELECT_WITH_BUTTON_PROPS } from './CellSelectWithMenu.constants';

describe('CellSelectWithMenu', () => {
  it('should render with default settings correctly', () => {
    const wrapper = render(
      <CellSelectWithMenu {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render CellSelectWithMenu', () => {
    const { queryByTestId } = render(
      <CellSelectWithMenu {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS} />,
    );
    // Adjust the testID to match the one used in CellSelectWithMenu, if different
    expect(queryByTestId(CellComponentSelectorsIDs.MULTISELECT)).not.toBe(null);
  });

  it('should make secondary text clickable when onTextClick is provided', () => {
    const mockOnTextClick = jest.fn();
    const { getByText } = render(
      <CellSelectWithMenu
        {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS}
        onTextClick={mockOnTextClick}
      />,
    );

    const secondaryTextElement = getByText(
      SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.secondaryText as string,
    );
    fireEvent.press(secondaryTextElement);

    // Verify the callback was called
    expect(mockOnTextClick).toHaveBeenCalledTimes(1);
  });

  it('should NOT make secondary text clickable when onTextClick is not provided', () => {
    const { getByText } = render(
      <CellSelectWithMenu {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS} />,
    );

    // Get the secondary text element
    const secondaryTextElement = getByText(
      SAMPLE_CELLSELECT_WITH_BUTTON_PROPS.secondaryText as string,
    );

    // When onTextClick is not provided, clicking the secondary text should not trigger any action
    // We test this by verifying no error is thrown when pressing (since there's no onPress handler)
    expect(() => fireEvent.press(secondaryTextElement)).not.toThrow();

    // Also verify the parent is not a TouchableOpacity by checking its type
    const parent = secondaryTextElement.parent;
    expect(parent?.type).not.toBe(TouchableOpacity);
  });
});
