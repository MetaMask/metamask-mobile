/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { boolean, select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';
import {
  DEFAULT_BUTTONBASE_SIZE,
  DEFAULT_BUTTONBASE_WIDTH,
  SAMPLE_BUTTONBASE_PROPS,
} from './ButtonBase.constants';
import { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import ButtonBase from './ButtonBase';
import { ButtonBaseProps } from './ButtonBase.types';

export const getButtonBaseStoryProps = (): ButtonBaseProps => {
  const sizeSelector = select(
    'size',
    ButtonSize,
    DEFAULT_BUTTONBASE_SIZE,
    storybookPropsGroupID,
  );
  const widthSelector = select(
    'width',
    ButtonWidthTypes,
    DEFAULT_BUTTONBASE_WIDTH,
    storybookPropsGroupID,
  );
  const labelInput = text(
    'label',
    SAMPLE_BUTTONBASE_PROPS.label,
    storybookPropsGroupID,
  );
  const isDangerToggle = boolean('isDanger', false, storybookPropsGroupID);

  const buttonBaseProps: ButtonBaseProps = {
    size: sizeSelector,
    width: widthSelector,
    label: labelInput,
    onPress: () => console.log("I'm clicked!"),
    isDanger: isDangerToggle,
  };
  const includesStartIconToggle = boolean(
    'includesStartIcon',
    false,
    storybookPropsGroupID,
  );

  if (includesStartIconToggle) {
    buttonBaseProps.startIconName = select(
      'startIconName',
      IconName,
      SAMPLE_BUTTONBASE_PROPS.startIconName,
      storybookPropsGroupID,
    );
  }

  const includesEndIconToggle = boolean(
    'includesEndIcon',
    false,
    storybookPropsGroupID,
  );

  if (includesEndIconToggle) {
    buttonBaseProps.endIconName = select(
      'endIconName',
      IconName,
      SAMPLE_BUTTONBASE_PROPS.endIconName,
      storybookPropsGroupID,
    );
  }

  return buttonBaseProps;
};

const ButtonBaseStory = () => <ButtonBase {...getButtonBaseStoryProps()} />;

export default ButtonBaseStory;
