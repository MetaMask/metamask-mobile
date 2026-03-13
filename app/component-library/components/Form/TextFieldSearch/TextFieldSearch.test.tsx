// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import { TEXTFIELDSEARCH_TEST_ID } from './TextFieldSearch.constants';
import styles from './TextFieldSearch.styles';

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
    render(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    expect(screen.getByTestId(TEXTFIELDSEARCH_TEST_ID)).toBeDefined();
  });

  it('applies rounded border radius style', () => {
    render(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    const textFieldComponent = screen.getByTestId(TEXTFIELDSEARCH_TEST_ID);
    const styleArray = textFieldComponent.props.style;

    expect(styleArray).toContainEqual(styles.base);
  });

  it('renders clear button when value exists', () => {
    render(
      <TextFieldSearch
        value="search text"
        onPressClearButton={mockOnPressClearButton}
      />,
    );

    const textFieldComponent = screen.getByTestId(TEXTFIELDSEARCH_TEST_ID);

    expect(textFieldComponent.props.endAccessory).not.toBe(false);
  });

  it('hides clear button when no value', () => {
    render(
      <TextFieldSearch onPressClearButton={mockOnPressClearButton} />,
    );

    const textFieldComponent = screen.getByTestId(TEXTFIELDSEARCH_TEST_ID);

    expect(textFieldComponent.props.endAccessory).toBe(false);
  });

  it('hides clear button when value is empty string', () => {
    render(
      <TextFieldSearch value="" onPressClearButton={mockOnPressClearButton} />,
    );

    const textFieldComponent = screen.getByTestId(TEXTFIELDSEARCH_TEST_ID);

    expect(textFieldComponent.props.endAccessory).toBe(false);
  });
});
