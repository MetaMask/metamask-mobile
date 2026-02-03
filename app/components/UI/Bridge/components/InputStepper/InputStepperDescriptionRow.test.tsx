import React from 'react';
import { render } from '@testing-library/react-native';
import { InputStepperDescriptionRow } from './InputStepperDescriptionRow';
import { InputStepperDescriptionType } from './constants';
import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';

describe('InputStepperDescriptionRow', () => {
  it('renders correct style when type is WARNING', () => {
    const description = {
      type: InputStepperDescriptionType.WARNING,
      message: 'Warning message',
      color: TextColor.WarningDefault,
      icon: {
        name: IconName.Warning,
        size: IconSize.Sm,
        color: IconColor.WarningDefault,
      },
    };

    const { toJSON } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correct style when type is ERROR', () => {
    const description = {
      type: InputStepperDescriptionType.ERROR,
      message: 'Error message',
      color: TextColor.ErrorDefault,
      icon: {
        name: IconName.Danger,
        size: IconSize.Sm,
        color: IconColor.ErrorDefault,
      },
    };

    const { toJSON } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders provided message', () => {
    const description = {
      type: InputStepperDescriptionType.WARNING,
      message: 'This is a custom warning message',
      color: TextColor.WarningDefault,
    };

    const { getByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    const messageElement = getByTestId('input-text-description-message');
    expect(messageElement.props.children).toBe(
      'This is a custom warning message',
    );
  });

  it('renders icon when provided', () => {
    const description = {
      type: InputStepperDescriptionType.WARNING,
      message: 'Warning with icon',
      color: TextColor.WarningDefault,
      icon: {
        name: IconName.Warning,
        size: IconSize.Md,
        color: IconColor.WarningDefault,
      },
    };

    const { toJSON, getByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    const icon = getByTestId('input-stepper-description-icon');
    expect(icon).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('does not render icon when not provided', () => {
    const description = {
      type: InputStepperDescriptionType.WARNING,
      message: 'Warning without icon',
      color: TextColor.WarningDefault,
    };

    const { queryByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    const icon = queryByTestId('input-stepper-description-icon');
    expect(icon).toBeNull();
  });

  it('renders correct icon style based on provided icon config', () => {
    const description = {
      type: InputStepperDescriptionType.ERROR,
      message: 'Error with custom icon',
      color: TextColor.ErrorDefault,
      icon: {
        name: IconName.Danger,
        size: IconSize.Lg,
        color: IconColor.ErrorDefault,
      },
    };

    const { toJSON, getByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    const icon = getByTestId('input-stepper-description-icon');
    expect(icon).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correct message color based on provided color property', () => {
    const warningDescription = {
      type: InputStepperDescriptionType.WARNING,
      message: 'Warning message',
      color: TextColor.WarningDefault,
    };

    const errorDescription = {
      type: InputStepperDescriptionType.ERROR,
      message: 'Error message',
      color: TextColor.ErrorDefault,
    };

    const { toJSON: warningJSON } = render(
      <InputStepperDescriptionRow description={warningDescription} />,
    );

    const { toJSON: errorJSON } = render(
      <InputStepperDescriptionRow description={errorDescription} />,
    );

    expect(warningJSON()).toMatchSnapshot('warning color');
    expect(errorJSON()).toMatchSnapshot('error color');
  });

  it('does not render component if no description prop is provided', () => {
    const { queryByTestId, toJSON } = render(
      <InputStepperDescriptionRow description={undefined} />,
    );

    const descriptionRow = queryByTestId('input-stepper-description-row');
    expect(descriptionRow).toBeNull();
    expect(toJSON()).toBeNull();
  });

  describe('edge cases', () => {
    it('renders with empty message', () => {
      const description = {
        type: InputStepperDescriptionType.WARNING,
        message: '',
        color: TextColor.WarningDefault,
      };

      const { getByTestId } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      const messageElement = getByTestId('input-text-description-message');
      expect(messageElement.props.children).toBe('');
    });

    it('renders with very long message', () => {
      const longMessage =
        'This is a very long warning message that should still render correctly without breaking the layout or causing any issues with the component rendering.';
      const description = {
        type: InputStepperDescriptionType.WARNING,
        message: longMessage,
        color: TextColor.WarningDefault,
      };

      const { toJSON } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders warning without icon', () => {
      const description = {
        type: InputStepperDescriptionType.WARNING,
        message: 'Warning message without icon',
        color: TextColor.WarningDefault,
      };

      const { toJSON } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders error without icon', () => {
      const description = {
        type: InputStepperDescriptionType.ERROR,
        message: 'Error message without icon',
        color: TextColor.ErrorDefault,
      };

      const { toJSON } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('different icon configurations', () => {
    it('renders with small icon size', () => {
      const description = {
        type: InputStepperDescriptionType.WARNING,
        message: 'Warning with small icon',
        color: TextColor.WarningDefault,
        icon: {
          name: IconName.Warning,
          size: IconSize.Sm,
          color: IconColor.WarningDefault,
        },
      };

      const { toJSON } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with medium icon size', () => {
      const description = {
        type: InputStepperDescriptionType.ERROR,
        message: 'Error with medium icon',
        color: TextColor.ErrorDefault,
        icon: {
          name: IconName.Danger,
          size: IconSize.Md,
          color: IconColor.ErrorDefault,
        },
      };

      const { toJSON } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with large icon size', () => {
      const description = {
        type: InputStepperDescriptionType.ERROR,
        message: 'Error with large icon',
        color: TextColor.ErrorDefault,
        icon: {
          name: IconName.Danger,
          size: IconSize.Lg,
          color: IconColor.ErrorDefault,
        },
      };

      const { toJSON } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with different icon names', () => {
      const infoDescription = {
        type: InputStepperDescriptionType.WARNING,
        message: 'Info message',
        color: TextColor.WarningDefault,
        icon: {
          name: IconName.Info,
          size: IconSize.Sm,
          color: IconColor.InfoDefault,
        },
      };

      const { toJSON } = render(
        <InputStepperDescriptionRow description={infoDescription} />,
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('layout and structure', () => {
    it('renders complete component with all props', () => {
      const description = {
        type: InputStepperDescriptionType.WARNING,
        message: 'Complete warning message',
        color: TextColor.WarningDefault,
        icon: {
          name: IconName.Warning,
          size: IconSize.Md,
          color: IconColor.WarningDefault,
        },
      };

      const { getByTestId, toJSON } = render(
        <InputStepperDescriptionRow description={description} />,
      );

      const descriptionRow = getByTestId('input-stepper-description-row');
      const icon = getByTestId('input-stepper-description-icon');
      const message = getByTestId('input-text-description-message');

      expect(descriptionRow).toBeTruthy();
      expect(icon).toBeTruthy();
      expect(message).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
