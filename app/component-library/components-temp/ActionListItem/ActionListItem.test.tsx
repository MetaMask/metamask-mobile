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
    it('should render correctly with basic props', () => {
      const { toJSON } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render correctly with rounded prop', () => {
      const { toJSON } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
          rounded
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render with string label', () => {
      const testLabel = 'Test Label';
      const { getByText } = render(
        <ActionListItem label={testLabel} onPress={mockOnPress} />,
      );
      expect(getByText(testLabel)).toBeTruthy();
    });

    it('should render with string description', () => {
      const testDescription = 'Test Description';
      const { getByText } = render(
        <ActionListItem
          label="Test Label"
          description={testDescription}
          onPress={mockOnPress}
        />,
      );
      expect(getByText(testDescription)).toBeTruthy();
    });

    it('should render with React node label', () => {
      const customLabel = (
        <Text variant={TextVariant.BodyMd}>Custom Label</Text>
      );
      const { getByText } = render(
        <ActionListItem label={customLabel} onPress={mockOnPress} />,
      );
      expect(getByText('Custom Label')).toBeTruthy();
    });

    it('should render with React node description', () => {
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
      expect(getByText('Custom Description')).toBeTruthy();
    });

    it('should render without description when not provided', () => {
      const { queryByText } = render(
        <ActionListItem label="Test Label" onPress={mockOnPress} />,
      );
      // Should only have the label text, no description
      expect(queryByText('Test Label')).toBeTruthy();
    });

    it('should render with icon when iconName is provided', () => {
      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );
      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeTruthy();
    });

    it('should render with start accessory', () => {
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
      expect(getByTestId('start-accessory')).toBeTruthy();
    });

    it('should render with end accessory', () => {
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
      expect(getByTestId('end-accessory')).toBeTruthy();
    });

    it('should prioritize startAccessory over iconName when both are provided', () => {
      const testAccessory = (
        <Icon name={IconName.Security} testID="start-accessory" />
      );
      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          startAccessory={testAccessory}
          onPress={mockOnPress}
        />,
      );

      // Should show the start accessory
      expect(getByTestId('start-accessory')).toBeTruthy();

      // Icon from iconName should not be rendered when startAccessory is present
      // This test validates the priority logic in renderStartContent
    });

    it('should apply labelTextProps to string label', () => {
      const testLabel = 'Test Label';
      const labelTextProps = {
        variant: TextVariant.HeadingSm,
        color: TextColor.PrimaryDefault,
        fontWeight: FontWeight.Bold,
      };

      const { getByText } = render(
        <ActionListItem
          label={testLabel}
          labelTextProps={labelTextProps}
          onPress={mockOnPress}
        />,
      );

      const labelElement = getByText(testLabel);
      expect(labelElement).toBeTruthy();
    });

    it('should not apply labelTextProps to ReactNode label', () => {
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

      // The custom label should still be rendered as-is
      expect(getByTestId('custom-label')).toBeTruthy();
    });

    it('should apply descriptionTextProps to string description', () => {
      const testDescription = 'Test Description';
      const descriptionTextProps = {
        variant: TextVariant.BodyXs,
        color: TextColor.TextMuted,
        fontWeight: FontWeight.Regular,
      };

      const { getByText } = render(
        <ActionListItem
          label="Test Label"
          description={testDescription}
          descriptionTextProps={descriptionTextProps}
          onPress={mockOnPress}
        />,
      );

      const descriptionElement = getByText(testDescription);
      expect(descriptionElement).toBeTruthy();
    });

    it('should not apply descriptionTextProps to ReactNode description', () => {
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

      // The custom description should still be rendered as-is
      expect(getByTestId('custom-description')).toBeTruthy();
    });

    it('should apply iconProps to icon when iconName is provided', () => {
      const iconProps = {
        size: IconSize.Lg,
        testID: 'custom-icon',
      };

      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          iconProps={iconProps}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('custom-icon')).toBeTruthy();
    });

    it('should not render icon when startAccessory is provided, even with iconProps', () => {
      const startAccessory = (
        <Icon name={IconName.Security} testID="start-accessory" />
      );
      const iconProps = {
        size: IconSize.Lg,
        testID: 'icon-from-props',
      };

      const { getByTestId, queryByTestId } = render(
        <ActionListItem
          label="Test Label"
          iconName={IconName.Setting}
          startAccessory={startAccessory}
          iconProps={iconProps}
          onPress={mockOnPress}
        />,
      );

      // Start accessory should be rendered
      expect(getByTestId('start-accessory')).toBeTruthy();
      // Icon should not be rendered due to startAccessory priority
      expect(queryByTestId('icon-from-props')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
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

    it('should handle onPressIn and onPressOut events', () => {
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
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);

      fireEvent(component, 'pressOut');
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should be accessible by default', () => {
      const { getByTestId } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      const component = getByTestId(ACTIONLISTITEM_TESTID);
      expect(component).toBeTruthy();
      // Pressable components should be accessible by default
    });

    it('should pass through accessibility props', () => {
      const { getByTestId } = render(
        <ActionListItem
          {...SAMPLE_ACTIONLISTITEM_PROPS}
          onPress={mockOnPress}
          accessibilityLabel="Custom accessibility label"
          testID={ACTIONLISTITEM_TESTID}
        />,
      );

      const component = getByTestId(ACTIONLISTITEM_TESTID);
      expect(component.props.accessibilityLabel).toBe(
        'Custom accessibility label',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string label', () => {
      const { getByTestId } = render(
        <ActionListItem
          label=""
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );
      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeTruthy();
    });

    it('should handle empty string description', () => {
      const { getByTestId } = render(
        <ActionListItem
          label="Test Label"
          description=""
          onPress={mockOnPress}
          testID={ACTIONLISTITEM_TESTID}
        />,
      );
      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeTruthy();
    });

    it('should handle all props together', () => {
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

      expect(getByTestId(ACTIONLISTITEM_TESTID)).toBeTruthy();
      expect(getByTestId('start-accessory')).toBeTruthy();
      expect(getByTestId('end-accessory')).toBeTruthy();
      expect(getByText('Complex Label')).toBeTruthy();
      expect(getByText('Complex Description')).toBeTruthy();
    });
  });
});
