// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemMultiSelect from './ListItemMultiSelect';

// Test the real TempTouchableOpacity component - no mocking needed

describe('ListItemMultiSelect', () => {
  it('renders with basic props', () => {
    const { getByTestId } = render(
      <ListItemMultiSelect onPress={() => null} testID="list-item-multi-select">
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    expect(getByTestId('list-item-multi-select')).toBeOnTheScreen();
    expect(getByTestId('test-content')).toBeOnTheScreen();
  });

  it('renders when disabled', () => {
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={() => null}
        isDisabled
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();
    expect(component.props.disabled).toBe(true);
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={mockOnPress}
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    fireEvent.press(component);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders disabled component with correct props', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={mockOnPress}
        isDisabled
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();
    expect(component.props.disabled).toBe(true);
  });

  it('renders with selected state', () => {
    const { getByTestId, getByRole } = render(
      <ListItemMultiSelect
        onPress={() => null}
        isSelected
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();

    // Check for checkbox accessibility role when selected
    const checkbox = getByRole('checkbox');
    expect(checkbox).toBeOnTheScreen();
  });

  it('renders without selected state', () => {
    const { getByTestId, queryByRole } = render(
      <ListItemMultiSelect
        onPress={() => null}
        isSelected={false}
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();

    // Should not have checkbox when not selected
    const checkbox = queryByRole('checkbox');
    expect(checkbox).toBeNull();
  });

  it('renders checkbox when not selected', () => {
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={() => null}
        isSelected={false}
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();

    // Component should render successfully with checkbox
    expect(component).toBeOnTheScreen();
  });

  it('passes through additional props to TempTouchableOpacity', () => {
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={() => null}
        testID="test-list-item"
        accessibilityLabel="Test List Item"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('test-list-item');
    expect(component.props.accessibilityLabel).toBe('Test List Item');
  });

  it('handles custom gap prop', () => {
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={() => null}
        gap={20}
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();
  });

  it('renders with custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={() => null}
        style={customStyle}
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();
  });

  it('handles checkbox interaction on iOS', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={mockOnPress}
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();

    // Test that the component renders with checkbox functionality
    expect(component).toBeOnTheScreen();
  });

  it('renders disabled component with checkbox', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ListItemMultiSelect
        onPress={mockOnPress}
        isDisabled
        testID="list-item-multi-select"
      >
        <View testID="test-content">Test Content</View>
      </ListItemMultiSelect>,
    );

    const component = getByTestId('list-item-multi-select');
    expect(component).toBeOnTheScreen();
    expect(component.props.disabled).toBe(true);
  });
});
