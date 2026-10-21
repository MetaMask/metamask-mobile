/* eslint-disable no-console */
import React from 'react';

import FooterGlass from './FooterGlass';

const FooterGlassMeta = {
  title: 'Components Temp / FooterGlass',
  component: FooterGlass,
};

export default FooterGlassMeta;

export const Primary = {
  render: () => (
    <FooterGlass
      primaryButtonProps={{
        children: 'Continue',
        onPress: () => console.log('Primary pressed'),
      }}
    />
  ),
};

export const PrimaryAndSecondary = {
  render: () => (
    <FooterGlass
      primaryButtonProps={{
        children: 'Continue',
        onPress: () => console.log('Primary pressed'),
      }}
      secondaryButtonProps={{
        children: 'Cancel',
        onPress: () => console.log('Secondary pressed'),
      }}
    />
  ),
};

export const AllButtons = {
  render: () => (
    <FooterGlass
      primaryButtonProps={{
        children: 'Continue',
        onPress: () => console.log('Primary pressed'),
      }}
      secondaryButtonProps={{
        children: 'Cancel',
        onPress: () => console.log('Secondary pressed'),
      }}
      tertiaryButtonProps={{
        children: 'Skip',
        onPress: () => console.log('Tertiary pressed'),
      }}
    />
  ),
};

export const SecondaryAndTertiary = {
  render: () => (
    <FooterGlass
      secondaryButtonProps={{
        children: 'Cancel',
        onPress: () => console.log('Secondary pressed'),
      }}
      tertiaryButtonProps={{
        children: 'Skip',
        onPress: () => console.log('Tertiary pressed'),
      }}
    />
  ),
};

export const PlainPrimary = {
  render: () => (
    <FooterGlass
      primaryButtonProps={{
        children: 'Continue',
        isGlass: false,
        onPress: () => console.log('Primary pressed'),
      }}
      secondaryButtonProps={{
        children: 'Cancel',
        onPress: () => console.log('Secondary pressed'),
      }}
      tertiaryButtonProps={{
        children: 'Skip',
        onPress: () => console.log('Tertiary pressed'),
      }}
    />
  ),
};
