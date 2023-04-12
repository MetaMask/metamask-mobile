/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import Button, { ButtonVariants } from '../Buttons/Button';
import ButtonIcon, { ButtonIconVariants } from '../Buttons/ButtonIcon';
import { IconName } from '../Icons/Icon';

// Internal dependencies.
import Header from './Header';
import { HeaderProps } from './Header.types';

export const getHeaderStoryProps = (): HeaderProps => ({
  startAccessory: (
    <ButtonIcon
      variant={ButtonIconVariants.Secondary}
      iconName={IconName.ArrowLeft}
      onPress={() => {
        console.log('clicked');
      }}
    />
  ),
  children: 'Super Long Header Title that may span 3 lines',
  endAccessory: (
    <Button
      variant={ButtonVariants.Primary}
      label="Cancel"
      onPress={() => {
        console.log('clicked');
      }}
    />
  ),
});

const HeaderStory = () => <Header {...getHeaderStoryProps()} />;

storiesOf('Component Library / Header', module).add('Header', HeaderStory);

export default HeaderStory;
