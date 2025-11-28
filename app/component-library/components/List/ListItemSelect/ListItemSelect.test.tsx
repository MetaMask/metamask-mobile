// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemSelect from './ListItemSelect';
import { VerticalAlignment } from '../ListItem/ListItem.types';

// Test the real TempTouchableOpacity component - no mocking needed

describe('ListItemSelect', () => {
  it('renders with basic props', () => {
    const { getByTestId } = render(
      <ListItemSelect onPress={() => null} testID="list-item-select">
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    expect(getByTestId('list-item-select')).toBeOnTheScreen();
    expect(getByTestId('test-content')).toBeOnTheScreen();
  });

  it('renders when disabled', () => {
    const { getByTestId } = render(
      <ListItemSelect onPress={() => null} isDisabled testID="list-item-select">
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    expect(component).toBeOnTheScreen();
    expect(component.props.disabled).toBe(true);
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ListItemSelect onPress={mockOnPress} testID="list-item-select">
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    fireEvent.press(component);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders disabled component with correct props', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ListItemSelect
        onPress={mockOnPress}
        isDisabled
        testID="list-item-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    expect(component).toBeOnTheScreen();
    expect(component.props.disabled).toBe(true);
  });

  it('calls onLongPress when long pressed', () => {
    const mockOnLongPress = jest.fn();
    const { getByTestId } = render(
      <ListItemSelect
        onPress={() => null}
        onLongPress={mockOnLongPress}
        testID="list-item-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    fireEvent(component, 'longPress');

    expect(mockOnLongPress).toHaveBeenCalledTimes(1);
  });

  it('renders with selected state', () => {
    const { getByTestId, getByRole } = render(
      <ListItemSelect onPress={() => null} isSelected testID="list-item-select">
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    expect(component).toBeOnTheScreen();

    // Check for checkbox accessibility role when selected
    const checkbox = getByRole('checkbox');
    expect(checkbox).toBeOnTheScreen();
  });

  it('renders without selected state', () => {
    const { getByTestId, queryByRole } = render(
      <ListItemSelect
        onPress={() => null}
        isSelected={false}
        testID="list-item-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    expect(component).toBeOnTheScreen();

    // Should not have checkbox when not selected
    const checkbox = queryByRole('checkbox');
    expect(checkbox).toBeNull();
  });

  it('passes through additional props to TempTouchableOpacity', () => {
    const { getByTestId } = render(
      <ListItemSelect
        onPress={() => null}
        testID="test-list-item"
        accessibilityLabel="Test List Item"
      >
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('test-list-item');
    expect(component.props.accessibilityLabel).toBe('Test List Item');
  });

  it('handles custom gap prop', () => {
    const { getByTestId } = render(
      <ListItemSelect onPress={() => null} gap={20} testID="list-item-select">
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    expect(component).toBeOnTheScreen();
  });

  it('handles custom vertical alignment', () => {
    const { getByTestId } = render(
      <ListItemSelect
        onPress={() => null}
        verticalAlignment={VerticalAlignment.Center}
        testID="list-item-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    expect(component).toBeOnTheScreen();
  });

  it('renders with custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <ListItemSelect
        onPress={() => null}
        style={customStyle}
        testID="list-item-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('list-item-select');
    expect(component).toBeOnTheScreen();
  });

  it('passes through custom listItemProps', () => {
    const { getByTestId } = render(
      <ListItemSelect
        onPress={() => null}
        listItemProps={{
          accessibilityHint: 'Custom Hint',
          testID: 'nested-list-item',
        }}
      >
        <View testID="test-content">Test Content</View>
      </ListItemSelect>,
    );

    const component = getByTestId('nested-list-item');
    expect(component.props.accessibilityHint).toBe('Custom Hint');
  });
});
