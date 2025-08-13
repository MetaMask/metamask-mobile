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
import { HeaderBaseVariant } from './HeaderBase.types';

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

export const HeaderBaseDisplayVariant = {
  render: () => (
    <HeaderBaseComponent
      variant={HeaderBaseVariant.Display}
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
      Display Variant - Left Aligned & Large Text
    </HeaderBaseComponent>
  ),
};

export const HeaderBaseCompactVariant = {
  render: () => (
    <HeaderBaseComponent
      variant={HeaderBaseVariant.Compact}
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
      Compact Variant - Center Aligned & Small Text
    </HeaderBaseComponent>
  ),
};

export const HeaderBaseDisplayVariantWithoutAccessories = {
  render: () => (
    <HeaderBaseComponent variant={HeaderBaseVariant.Display}>
      Display Variant Without Accessories
    </HeaderBaseComponent>
  ),
};

export const HeaderBaseCompactVariantWithoutAccessories = {
  render: () => (
    <HeaderBaseComponent variant={HeaderBaseVariant.Compact}>
      Compact Variant Without Accessories
    </HeaderBaseComponent>
  ),
};
