/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { TextVariant } from '../../../../Texts/Text';
import { getButtonBaseStoryProps } from '../../foundation/ButtonBase/ButtonBase.stories';

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

  return {
    ...getButtonBaseStoryProps(),
    textVariant: textVariantSelector,
  };
};

const ButtonLinkStory = () => <ButtonLink {...getButtonLinkStoryProps()} />;

export default ButtonLinkStory;
