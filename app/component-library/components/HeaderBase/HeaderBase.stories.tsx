/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Button, { ButtonVariants } from '../Buttons/Button';
import ButtonIcon from '../Buttons/ButtonIcon';
import { IconName, IconColor } from '../Icons/Icon';

// Internal dependencies.
import { default as HeaderBaseComponent } from './HeaderBase';

const HeaderBaseStoryMeta = {
  title: 'Component Library / HeaderBase',
  component: HeaderBaseComponent,
};

export default HeaderBaseStoryMeta;

export const HeaderBase = {
  render: () => (
    <HeaderBaseComponent
      startAccessory={
        <ButtonIcon
          iconColor={IconColor.Default}
          iconName={IconName.ArrowLeft}
          onPress={() => {
            console.log('clicked');
          }}
        />
      }
      endAccessory={
        <Button
          variant={ButtonVariants.Primary}
          label="Cancel"
          onPress={() => {
            console.log('clicked');
          }}
        />
      }
    >
      Super Long HeaderBase Title that may span 3 lines
    </HeaderBaseComponent>
  ),
};
