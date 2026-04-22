// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import { TEXTFIELDSEARCH_TEST_ID } from './TextFieldSearch.constants';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from '../TextField/TextField.constants';

describe('TextFieldSearch', () => {
  const mockOnPressClearButton = jest.fn();

  beforeEach(() => {
    mockOnPressClearButton.mockClear();
  });

  it('renders default settings correctly', () => {
    const { toJSON } = render(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders TextFieldSearch component', () => {
    render(<TextFieldSearch onPressClearButton={mockOnPressClearButton} />);

    expect(screen.getByTestId(TEXTFIELDSEARCH_TEST_ID)).toBeDefined();
  });

  it('applies rounded border radius style', () => {
    render(<TextFieldSearch onPressClearButton={mockOnPressClearButton} />);

    const textFieldContainer = screen.getByTestId(TEXTFIELD_TEST_ID);
    const containerStyle = textFieldContainer.props.style;

    // The borderRadius from TextFieldSearch.styles.base (24) should be applied
    const flatStyle = Array.isArray(containerStyle)
      ? Object.assign({}, ...containerStyle.flat(Infinity).filter(Boolean))
      : containerStyle;
    expect(flatStyle).toHaveProperty('borderRadius', 24);
  });

  it('renders clear button when value exists', () => {
    render(
      <TextFieldSearch
        value="search text"
        onPressClearButton={mockOnPressClearButton}
      />,
    );

    // When value exists, the end accessory container should be rendered
    expect(screen.queryByTestId(TEXTFIELD_ENDACCESSORY_TEST_ID)).toBeTruthy();
  });

  it('hides clear button when no value', () => {
    render(<TextFieldSearch onPressClearButton={mockOnPressClearButton} />);

    // When no value, the end accessory container should not be rendered
    expect(screen.queryByTestId(TEXTFIELD_ENDACCESSORY_TEST_ID)).toBeNull();
  });

  it('hides clear button when value is empty string', () => {
    render(
      <TextFieldSearch value="" onPressClearButton={mockOnPressClearButton} />,
    );

    // When value is empty string, the end accessory container should not be rendered
    expect(screen.queryByTestId(TEXTFIELD_ENDACCESSORY_TEST_ID)).toBeNull();
  });
});
