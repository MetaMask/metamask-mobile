// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { fireEvent, render } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { TextVariant } from '../../../../Texts/Text';

// Internal dependencies.
import ButtonBase from './ButtonBase';
import { ButtonSize } from '../../Button.types';

describe('ButtonBase', () => {
  it('renders with basic props', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders when disabled', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        isDisabled
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('calls onPress when button is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ButtonBase
        label="Test Button"
        onPress={mockOnPress}
        size={ButtonSize.Md}
      />,
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders disabled button with correct props', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ButtonBase
        label="Test Button"
        onPress={mockOnPress}
        isDisabled
        size={ButtonSize.Md}
      />,
    );

    const button = getByRole('button');

    // Verify the button is marked as disabled
    expect(button.props.disabled).toBe(true);
  });

  it('calls onPressIn when button is pressed in', () => {
    const mockOnPressIn = jest.fn();
    const { getByRole } = render(
      <ButtonBase
        label="Test Button"
        onPress={() => null}
        onPressIn={mockOnPressIn}
        size={ButtonSize.Md}
      />,
    );

    const button = getByRole('button');
    fireEvent(button, 'pressIn');

    expect(mockOnPressIn).toHaveBeenCalledTimes(1);
  });

  it('renders disabled button with onPressIn prop', () => {
    const mockOnPressIn = jest.fn();
    const { getByRole } = render(
      <ButtonBase
        label="Test Button"
        onPress={() => null}
        onPressIn={mockOnPressIn}
        isDisabled
        size={ButtonSize.Md}
      />,
    );

    const button = getByRole('button');

    // Verify the button is marked as disabled
    expect(button.props.disabled).toBe(true);
  });

  it('renders with start icon', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        startIconName={IconName.Add}
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with end icon', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        endIconName={IconName.Add}
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with both start and end icons', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        startIconName={IconName.Add}
        endIconName={IconName.ArrowRight}
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with custom label component', () => {
    const CustomLabel = () => <div>Custom Label</div>;
    const wrapper = shallow(
      <ButtonBase
        label={<CustomLabel />}
        onPress={() => null}
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('handles different sizes', () => {
    const sizes = [ButtonSize.Sm, ButtonSize.Md, ButtonSize.Lg];

    sizes.forEach((size) => {
      const wrapper = shallow(
        <ButtonBase label="Click me!" onPress={() => null} size={size} />,
      );
      expect(wrapper).toMatchSnapshot(`ButtonBase with size ${size}`);
    });
  });

  it('handles different widths', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        width={200}
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('handles custom label color', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        labelColor="#ff0000"
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('handles custom label text variant', () => {
    const wrapper = shallow(
      <ButtonBase
        label="Click me!"
        onPress={() => null}
        labelTextVariant={TextVariant.HeadingSM}
        size={ButtonSize.Md}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
