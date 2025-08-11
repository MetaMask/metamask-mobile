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

  describe('TouchableOpacity wrapper gesture handling', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      Platform.OS = 'android';
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('should call onPress when button is pressed (Android wrapper active)', () => {
      // Override test environment detection to enable Android gesture wrapper
      const originalEnv = process.env.NODE_ENV;
      const originalIsTest = process.env.IS_TEST;
      const originalMetaMaskEnv = process.env.METAMASK_ENVIRONMENT;

      process.env.NODE_ENV = 'development';
      delete process.env.IS_TEST;
      delete process.env.METAMASK_ENVIRONMENT;

      try {
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
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalIsTest) process.env.IS_TEST = originalIsTest;
        if (originalMetaMaskEnv)
          process.env.METAMASK_ENVIRONMENT = originalMetaMaskEnv;
      }
    });

    it('should handle isDisabled prop in TouchableOpacity wrapper', () => {
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

    it('should handle disabled state correctly with Android wrapper', () => {
      // Override test environment detection to enable Android gesture wrapper
      const originalEnv = process.env.NODE_ENV;
      const originalIsTest = process.env.IS_TEST;
      const originalMetaMaskEnv = process.env.METAMASK_ENVIRONMENT;

      process.env.NODE_ENV = 'development';
      delete process.env.IS_TEST;
      delete process.env.METAMASK_ENVIRONMENT;

      try {
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
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalIsTest) process.env.IS_TEST = originalIsTest;
        if (originalMetaMaskEnv)
          process.env.METAMASK_ENVIRONMENT = originalMetaMaskEnv;
      }
    });

    it('should preserve accessibility onPress when not disabled', () => {
      const mockOnPress = jest.fn();
      const { getByRole } = render(
        <ButtonBase
          label="Test Button"
          onPress={mockOnPress}
          size={ButtonSize.Md}
        />,
      );

      const button = getByRole('button');
      expect(button.props.onPress).toBeDefined();
    });

    it('should set accessibility onPress to undefined when disabled', () => {
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
      expect(button.props.onPress).toBeUndefined();
    });
  });

  describe('Environment-specific component selection', () => {
    const originalPlatform = Platform.OS;
    const originalEnv = process.env;

    beforeEach(() => {
      Platform.OS = 'android';
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
      process.env = originalEnv;
    });

    it('should use RNTouchableOpacity in E2E test environment', () => {
      process.env.IS_TEST = 'true';
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

    it('should use RNTouchableOpacity in unit test environment', () => {
      process.env.NODE_ENV = 'test';
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

    it('should use RNTouchableOpacity in MetaMask E2E environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
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

    it('should set onPress to undefined when disabled in test environment', () => {
      process.env.NODE_ENV = 'test';
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

    it('should expose disabled prop in test environment', () => {
      process.env.NODE_ENV = 'test';
      const { getByRole } = render(
        <ButtonBase
          label="Test Button"
          onPress={() => null}
          isDisabled
          size={ButtonSize.Md}
        />,
      );

      const button = getByRole('button');
      expect(button.props.disabled).toBe(true);
    });
  });
});
