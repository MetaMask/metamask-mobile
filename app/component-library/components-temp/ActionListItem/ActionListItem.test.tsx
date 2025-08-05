// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import ActionListItem from './ActionListItem';
import {
  ACTIONLISTITEM_TESTID,
  SAMPLE_ACTIONLISTITEM_PROPS,
} from './ActionListItem.constants';

describe('ActionListItem', () => {
  it('should render correctly', () => {
    const { getByText } = render(
      <ActionListItem
        {...SAMPLE_ACTIONLISTITEM_PROPS}
        testID={ACTIONLISTITEM_TESTID}
      />,
    );

    expect(getByText('Sample Action')).toBeTruthy();
    expect(getByText('This is a sample action description')).toBeTruthy();
  });

  it('should render with string label', () => {
    const testLabel = 'Test Label';
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ActionListItem label={testLabel} onPress={mockOnPress} />,
    );

    expect(getByText(testLabel)).toBeTruthy();
  });

  it('should render with custom label component', () => {
    const customLabel = <span>Custom Label Component</span>;
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ActionListItem label={customLabel} onPress={mockOnPress} />,
    );

    expect(getByText('Custom Label Component')).toBeTruthy();
  });

  it('should render without description when not provided', () => {
    const { queryByText } = render(
      <ActionListItem label="Test Label" onPress={jest.fn()} />,
    );

    expect(queryByText('This is a sample action description')).toBeNull();
  });

  it('should render with testID when provided', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ActionListItem
        label="Test Label"
        onPress={mockOnPress}
        testID={ACTIONLISTITEM_TESTID}
      />,
    );

    expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeTruthy();
  });

  it('should render with icon when iconName is provided', () => {
    const { getByTestId } = render(
      <ActionListItem
        label="Test"
        iconName={IconName.Add}
        onPress={jest.fn()}
        testID={ACTIONLISTITEM_TESTID}
      />,
    );

    expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeTruthy();
  });

  it('should render with startAccessory when provided', () => {
    const startAccessory = <span>Start Accessory</span>;

    const { getByText } = render(
      <ActionListItem
        label="Test"
        startAccessory={startAccessory}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('Start Accessory')).toBeTruthy();
  });

  it('should render with endAccessory when provided', () => {
    const endAccessory = <span>End Accessory</span>;

    const { getByText } = render(
      <ActionListItem
        label="Test"
        endAccessory={endAccessory}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('End Accessory')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ActionListItem
        {...SAMPLE_ACTIONLISTITEM_PROPS}
        onPress={mockOnPress}
        testID={ACTIONLISTITEM_TESTID}
      />,
    );

    fireEvent.press(getByTestId(ACTIONLISTITEM_TESTID));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ActionListItem
        {...SAMPLE_ACTIONLISTITEM_PROPS}
        onPress={mockOnPress}
        disabled
        testID={ACTIONLISTITEM_TESTID}
      />,
    );

    fireEvent.press(getByTestId(ACTIONLISTITEM_TESTID));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should render with string description', () => {
    const testDescription = 'Test description text';

    const { getByText } = render(
      <ActionListItem
        label="Test"
        description={testDescription}
        onPress={jest.fn()}
      />,
    );

    expect(getByText(testDescription)).toBeTruthy();
  });

  it('should render with custom description component', () => {
    const customDescription = <span>Custom Description</span>;

    const { getByText } = render(
      <ActionListItem
        label="Test"
        description={customDescription}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('Custom Description')).toBeTruthy();
  });
});
