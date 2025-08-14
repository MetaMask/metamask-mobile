// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';

// Internal dependencies.
import QuickActionButtons from './QuickActionButtons';
import QuickActionButton from './QuickActionButton/QuickActionButton';

describe('QuickActionButtons', () => {
  const mockOnPress1 = jest.fn();
  const mockOnPress2 = jest.fn();
  const mockOnPress3 = jest.fn();

  beforeEach(() => {
    mockOnPress1.mockClear();
    mockOnPress2.mockClear();
    mockOnPress3.mockClear();
  });

  it('renders correctly with default props', () => {
    const { getByTestId, getByText } = render(
      <QuickActionButtons testID="quick-action-buttons">
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
      </QuickActionButtons>,
    );

    // Container should be rendered
    expect(getByTestId('quick-action-buttons')).toBeTruthy();

    // Both buttons should be visible
    expect(getByText('Button 1')).toBeOnTheScreen();
    expect(getByText('Button 2')).toBeOnTheScreen();
  });

  it('renders buttons in rows based on buttonsPerRow prop', () => {
    const { getAllByTestId } = render(
      <QuickActionButtons
        buttonsPerRow={2}
        testID="quick-action-buttons"
        rowWrapperProps={{ testID: 'row' }}
      >
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
        <QuickActionButton onPress={mockOnPress3}>Button 3</QuickActionButton>
      </QuickActionButtons>,
    );

    // Should have 2 row containers (3 buttons with 2 per row = 2 rows)
    const rows = getAllByTestId('row');
    expect(rows).toHaveLength(2);
  });

  it('adds spacers for incomplete rows', () => {
    const { getAllByTestId } = render(
      <QuickActionButtons buttonsPerRow={4} spacerProps={{ testID: 'spacer' }}>
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
      </QuickActionButtons>,
    );

    // Should have spacers to fill the row (2 buttons + 2 spacers = 4 total)
    const spacers = getAllByTestId('spacer');
    expect(spacers).toHaveLength(2);
  });

  it('handles empty children', () => {
    const { getByTestId, queryAllByTestId } = render(
      <QuickActionButtons
        testID="quick-action-buttons"
        rowWrapperProps={{ testID: 'row' }}
      >
        {null}
        {undefined}
        {false}
      </QuickActionButtons>,
    );

    // Container should exist but no rows or buttons
    expect(getByTestId('quick-action-buttons')).toBeTruthy();
    const rows = queryAllByTestId('row');
    expect(rows).toHaveLength(0);
  });

  it('accepts custom components alongside QuickActionButton children', () => {
    // When rendering QuickActionButtons with mixed children
    const { getByText, getByTestId, getAllByTestId } = render(
      <QuickActionButtons buttonWrapperProps={{ testID: 'button-wrapper' }}>
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <Text testID="custom-button">Custom Button</Text>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
      </QuickActionButtons>,
    );

    // Then all components should be rendered
    expect(getByText('Button 1')).toBeOnTheScreen();
    expect(getByText('Custom Button')).toBeOnTheScreen();
    expect(getByText('Button 2')).toBeOnTheScreen();
    expect(getByTestId('custom-button')).toBeOnTheScreen();

    // And each should be wrapped
    const wrappers = getAllByTestId('button-wrapper');
    expect(wrappers).toHaveLength(3);
  });

  it('handles single button per row', () => {
    const { getAllByTestId } = render(
      <QuickActionButtons buttonsPerRow={1} rowWrapperProps={{ testID: 'row' }}>
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
        <QuickActionButton onPress={mockOnPress3}>Button 3</QuickActionButton>
      </QuickActionButtons>,
    );

    // Should have 3 rows with 1 button each
    const rows = getAllByTestId('row');
    expect(rows).toHaveLength(3);
  });

  it('handles many buttons per row', () => {
    const { getAllByTestId } = render(
      <QuickActionButtons
        buttonsPerRow={6}
        rowWrapperProps={{ testID: 'row' }}
        spacerProps={{ testID: 'spacer' }}
      >
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
        <QuickActionButton onPress={mockOnPress3}>Button 3</QuickActionButton>
      </QuickActionButtons>,
    );

    // Should have 1 row with all 3 buttons
    const rows = getAllByTestId('row');
    expect(rows).toHaveLength(1);

    // Should have 3 spacers (6 per row - 3 buttons = 3 spacers)
    const spacers = getAllByTestId('spacer');
    expect(spacers).toHaveLength(3);
  });

  it('preserves button keys when provided', () => {
    const { toJSON } = render(
      <QuickActionButtons>
        <QuickActionButton key="first" onPress={mockOnPress1}>
          Button 1
        </QuickActionButton>
        <QuickActionButton key="second" onPress={mockOnPress2}>
          Button 2
        </QuickActionButton>
      </QuickActionButtons>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('applies rowWrapperProps to row containers', () => {
    const { getByTestId } = render(
      <QuickActionButtons
        buttonsPerRow={2}
        rowWrapperProps={{ testID: 'custom-row' }}
      >
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
      </QuickActionButtons>,
    );

    // Row container should have the custom testID
    expect(getByTestId('custom-row')).toBeTruthy();
  });

  it('applies buttonWrapperProps to button wrappers', () => {
    const { getAllByTestId } = render(
      <QuickActionButtons buttonWrapperProps={{ testID: 'button-wrapper' }}>
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
      </QuickActionButtons>,
    );

    // Should have 2 button wrappers
    const wrappers = getAllByTestId('button-wrapper');
    expect(wrappers).toHaveLength(2);
  });

  it('applies spacerProps to spacer elements', () => {
    const { getAllByTestId } = render(
      <QuickActionButtons buttonsPerRow={4} spacerProps={{ testID: 'spacer' }}>
        <QuickActionButton onPress={mockOnPress1}>Button 1</QuickActionButton>
        <QuickActionButton onPress={mockOnPress2}>Button 2</QuickActionButton>
      </QuickActionButtons>,
    );

    // Should have 2 spacers (4 per row - 2 buttons = 2 spacers)
    const spacers = getAllByTestId('spacer');
    expect(spacers).toHaveLength(2);
  });
});
