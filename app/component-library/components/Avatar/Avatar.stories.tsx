import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import Avatar from './Avatar';
import { AvatarSize } from './Avatar.types';
import { toDataUrl } from '../../../util/blockies';
import { DUMMY_IMAGE_DATA } from './Avatar.constants';

const styles = StyleSheet.create({ imageStyle: { flex: 1 } });

storiesOf('Component Library / Avatar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select('Size', AvatarSize, AvatarSize.Md);

    return (
      <Avatar size={sizeSelector}>
        <Image
          source={{ uri: toDataUrl(DUMMY_IMAGE_DATA) }}
          style={styles.imageStyle}
        />
      </Avatar>
    );
  });
