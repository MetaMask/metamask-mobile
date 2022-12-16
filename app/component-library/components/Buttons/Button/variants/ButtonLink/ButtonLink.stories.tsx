/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text } from '@storybook/addon-knobs';

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
  const childrenText = text(
    'textVariants',
    'Sample Button Link Text',
    storybookPropsGroupID,
  );
  return {
    textVariants: textVariantsSelector,
    children: childrenText,
    onPress: () => console.log("I'm clicked!"),
  };
};

const ButtonLinkStory = () => <ButtonLink {...getButtonLinkStoryProps()} />;

export default ButtonLinkStory;
