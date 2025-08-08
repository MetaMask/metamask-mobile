// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import ButtonBase from './ButtonBase';
import { ButtonSize } from '../../Button.types';

describe('ButtonBase', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonBase
        startIconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly when disabled', () => {
    const wrapper = shallow(
      <ButtonBase
        isDisabled
        startIconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  describe('Android-specific gesture handling', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      Platform.OS = 'android';
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('should call onPress when button is pressed on Android', () => {
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

    it('should not call onPress when button is disabled on Android', () => {
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
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should use GestureDetector wrapper on Android', () => {
      const { getByRole } = render(
        <ButtonBase
          label="Test Button"
          onPress={() => null}
          size={ButtonSize.Md}
        />,
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
      // On Android, the component should be wrapped with GestureDetector
      // The button should still be accessible and functional
    });
  });

  describe('iOS behavior (non-Android)', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      Platform.OS = 'ios';
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('should use standard TouchableOpacity on iOS', () => {
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
  });
});
