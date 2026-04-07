// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import {
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import ActionListItem from './ActionListItem';
import {
  ACTIONLISTITEM_TESTID,
  SAMPLE_ACTIONLISTITEM_PROPS,
} from './ActionListItem.constants';

describe('ActionListItem', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with basic props', () => {
      const { getByTestId } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeOnTheScreen();
    });

    it('renders string label', () => {
      const { getByText } = render(
        <ActionListItem label="Test Label" onPress={mockOnPress} />,
      );

      expect(getByText('Test Label')).toBeOnTheScreen();
    });

    it('renders string description', () => {
      const { getByText } = render(
        <ActionListItem
          label="Test Label"
          description="Test Description"
          onPress={mockOnPress}
        />,
      );

      expect(getByText('Test Description')).toBeOnTheScreen();
    });

    it('renders ReactNode label', () => {
      const customLabel = (
        <Text variant={TextVariant.BodyMd}>Custom Label</Text>
      );

      const { getByText } = render(
        <ActionListItem label={customLabel} onPress={mockOnPress} />,
      );

      expect(getByText('Custom Label')).toBeOnTheScreen();
    });

    it('renders ReactNode description', () => {
      const customDescription = (
        <Text variant={TextVariant.BodySm}>Custom Description</Text>
      );

      const { getByText } = render(
        <ActionListItem
          label="Test Label"
          description={customDescription}
          onPress={mockOnPress}
        />,
      );

      expect(getByText('Custom Description')).toBeOnTheScreen();
    });

    it('renders label without description when description is not provided', () => {
      const { getByText, queryByTestId } = render(
        <ActionListItem label="Test Label" onPress={mockOnPress} />,
      );

      expect(getByText('Test Label')).toBeOnTheScreen();
      expect(queryByTestId('description')).toBeNull();
    });

    it('renders icon when iconName is provided', () => {
      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeOnTheScreen();
    });

    it('renders start accessory', () => {
      const testAccessory = (
        <Icon name={IconName.Security} testID="start-accessory" />
      );

      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          startAccessory={testAccessory}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('start-accessory')).toBeOnTheScreen();
    });

    it('renders end accessory', () => {
      const testAccessory = (
        <Icon name={IconName.ArrowRight} testID="end-accessory" />
      );

      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          endAccessory={testAccessory}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('end-accessory')).toBeOnTheScreen();
    });

    it('renders startAccessory instead of iconName when both are provided', () => {
      const testAccessory = (
        <Icon name={IconName.Security} testID="start-accessory" />
      );

      const { getByTestId, queryByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          startAccessory={testAccessory}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('start-accessory')).toBeOnTheScreen();
      expect(queryByTestId('icon-from-iconName')).toBeNull();
    });

    it('applies labelTextProps to string label', () => {
      const { getByText } = render(
        <ActionListItem
          label="Test Label"
          labelTextProps={{
            variant: TextVariant.HeadingSm,
            color: TextColor.PrimaryDefault,
            fontWeight: FontWeight.Bold,
          }}
          onPress={mockOnPress}
        />,
      );

      expect(getByText('Test Label')).toBeOnTheScreen();
    });

    it('renders ReactNode label as-is when labelTextProps are provided', () => {
      const customLabel = (
        <Text variant={TextVariant.BodySm} testID="custom-label">
          Custom Label
        </Text>
      );

      const { getByTestId } = render(
        <ActionListItem
          label={customLabel}
          labelTextProps={{
            variant: TextVariant.HeadingSm,
            color: TextColor.PrimaryDefault,
          }}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('custom-label')).toBeOnTheScreen();
    });

    it('applies descriptionTextProps to string description', () => {
      const { getByText } = render(
        <ActionListItem
          label="Test Label"
          description="Test Description"
          descriptionTextProps={{
            variant: TextVariant.BodyXs,
            color: TextColor.TextMuted,
            fontWeight: FontWeight.Regular,
          }}
          onPress={mockOnPress}
        />,
      );

      expect(getByText('Test Description')).toBeOnTheScreen();
    });

    it('renders ReactNode description as-is when descriptionTextProps are provided', () => {
      const customDescription = (
        <Text variant={TextVariant.BodyLg} testID="custom-description">
          Custom Description
        </Text>
      );

      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          description={customDescription}
          descriptionTextProps={{
            variant: TextVariant.BodyXs,
            color: TextColor.TextMuted,
          }}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('custom-description')).toBeOnTheScreen();
    });

    it('applies iconProps to icon when iconName is provided', () => {
      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          iconProps={{ size: IconSize.Lg, testID: 'custom-icon' }}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('custom-icon')).toBeOnTheScreen();
    });

    it('omits icon from iconName when startAccessory and iconProps are both provided', () => {
      const startAccessory = (
        <Icon name={IconName.Security} testID="start-accessory" />
      );

      const { getByTestId, queryByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          startAccessory={startAccessory}
          iconProps={{ size: IconSize.Lg, testID: 'icon-from-props' }}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('start-accessory')).toBeOnTheScreen();
      expect(queryByTestId('icon-from-props')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('calls onPress when pressed', () => {
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

    it('does not call onPress when disabled', () => {
      const { getByTestId } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
          isDisabled
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      fireEvent.press(getByTestId(ACTIONLISTITEM_TESTID));

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('fires onPressIn and onPressOut callbacks', () => {
      const mockOnPressIn = jest.fn();
      const mockOnPressOut = jest.fn();

      const { getByTestId } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          onPressOut={mockOnPressOut}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );
      const component = getByTestId(ACTIONLISTITEM_TESTID);

      fireEvent(component, 'pressIn');
      fireEvent(component, 'pressOut');

      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('passes through accessibilityLabel prop', () => {
      const { getByTestId } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
          accessibilityLabel="Custom accessibility label"
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      expect(getByTestId(ACTIONLISTITEM_TESTID).props.accessibilityLabel).toBe(
        'Custom accessibility label',
      );
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty string label', () => {
      const { getByTestId } = render(
        <ActionListItem
          label=""
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeOnTheScreen();
    });

    it('renders with empty string description', () => {
      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          description=""
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeOnTheScreen();
    });

    it('renders all props together', () => {
      const startAccessory = (
        <Icon name={IconName.Security} testID="start-accessory" />
      );
      const endAccessory = (
        <Icon name={IconName.ArrowRight} testID="end-accessory" />
      );

      const { getByTestId, getByText } = render(
        <ActionListItem
          label="Complex Label"
          description="Complex Description"
          startAccessory={startAccessory}
          endAccessory={endAccessory}
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeOnTheScreen();
      expect(getByTestId('start-accessory')).toBeOnTheScreen();
      expect(getByTestId('end-accessory')).toBeOnTheScreen();
      expect(getByText('Complex Label')).toBeOnTheScreen();
      expect(getByText('Complex Description')).toBeOnTheScreen();
    });
  });
});
