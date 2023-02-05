/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { TextVariant } from '../../../../Texts/Text';

// Internal dependencies.
import ButtonLink from './ButtonLink';
import { ButtonLinkProps } from './ButtonLink.types';

export const getButtonLinkStoryProps = (): ButtonLinkProps => {
  const textVariantSelector = select(
    'textVariant',
    TextVariant,
    TextVariant.HeadingSMRegular,
    storybookPropsGroupID,
  );
  const childrenText = text(
    'textVariant',
    'Sample Button Link Text',
    storybookPropsGroupID,
  );
  return {
    textVariant: textVariantSelector,
    children: childrenText,
    onPress: () => console.log("I'm clicked!"),
  };
};

const ButtonLinkStory = () => <ButtonLink {...getButtonLinkStoryProps()} />;

export default ButtonLinkStory;
