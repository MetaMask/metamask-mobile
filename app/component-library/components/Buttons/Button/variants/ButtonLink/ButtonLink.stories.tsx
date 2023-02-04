/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { boolean, select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { TextVariants } from '../../../../Texts/Text';

// Internal dependencies.
import ButtonLink from './ButtonLink';
import { ButtonLinkProps } from './ButtonLink.types';

export const getButtonLinkStoryProps = (): ButtonLinkProps => {
  const textVariantsSelector = select(
    'textVariants',
    TextVariants,
    TextVariants.lBodyMD,
    storybookPropsGroupID,
  );
  const label = text('label', 'Sample Button Link Text', storybookPropsGroupID);
  const isDanger = boolean('isDanger', false, storybookPropsGroupID);

  return {
    textVariants: textVariantsSelector,
    label,
    onPress: () => console.log("I'm clicked!"),
    isDanger,
  };
};

const ButtonLinkStory = () => <ButtonLink {...getButtonLinkStoryProps()} />;

export default ButtonLinkStory;
