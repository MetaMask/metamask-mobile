import React from 'react';
import { render } from '@testing-library/react-native';
import { InputStepperDescriptionRow } from './InputStepperDescriptionRow';
import {
  INPUTSTEPPER_DESCRIPTION_ICON_TESTID,
  INPUTSTEPPER_DESCRIPTION_MESSAGE_TESTID,
  INPUTSTEPPER_DESCRIPTION_ROW_TESTID,
  InputStepperDescriptionType,
} from './InputStepper.constants';
import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';

describe('InputStepperDescriptionRow', () => {
  it('renders warning description', () => {
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

    const { getByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    expect(getByTestId(INPUTSTEPPER_DESCRIPTION_ROW_TESTID)).toBeOnTheScreen();
  });

  it('renders error description', () => {
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

    const { getByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    expect(getByTestId(INPUTSTEPPER_DESCRIPTION_ROW_TESTID)).toBeOnTheScreen();
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

    expect(
      getByTestId(INPUTSTEPPER_DESCRIPTION_MESSAGE_TESTID).props.children,
    ).toBe('This is a custom warning message');
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

    const { getByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    expect(getByTestId(INPUTSTEPPER_DESCRIPTION_ICON_TESTID)).toBeOnTheScreen();
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

    expect(queryByTestId(INPUTSTEPPER_DESCRIPTION_ICON_TESTID)).toBeNull();
  });

  it('returns null when description is omitted', () => {
    const { queryByTestId, toJSON } = render(
      <InputStepperDescriptionRow description={undefined} />,
    );

    expect(queryByTestId(INPUTSTEPPER_DESCRIPTION_ROW_TESTID)).toBeNull();
    expect(toJSON()).toBeNull();
  });

  it('renders empty message', () => {
    const description = {
      type: InputStepperDescriptionType.WARNING,
      message: '',
      color: TextColor.WarningDefault,
    };

    const { getByTestId } = render(
      <InputStepperDescriptionRow description={description} />,
    );

    expect(
      getByTestId(INPUTSTEPPER_DESCRIPTION_MESSAGE_TESTID).props.children,
    ).toBe('');
  });
});
