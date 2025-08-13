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
import { HeaderBaseAlign } from './HeaderBase.constants';

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

export const HeaderBaseCenterAligned = {
  render: () => (
    <HeaderBaseComponent
      align={HeaderBaseAlign.Center}
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
      Center Aligned Title
    </HeaderBaseComponent>
  ),
};

export const HeaderBaseLeftAligned = {
  render: () => (
    <HeaderBaseComponent
      align={HeaderBaseAlign.Left}
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
      Left Aligned Title
    </HeaderBaseComponent>
  ),
};

export const HeaderBaseLeftAlignedWithoutAccessories = {
  render: () => (
    <HeaderBaseComponent align={HeaderBaseAlign.Left}>
      Left Aligned Title Without Accessories
    </HeaderBaseComponent>
  ),
};

export const HeaderBaseCenterAlignedWithoutAccessories = {
  render: () => (
    <HeaderBaseComponent align={HeaderBaseAlign.Center}>
      Center Aligned Title Without Accessories
    </HeaderBaseComponent>
  ),
};
