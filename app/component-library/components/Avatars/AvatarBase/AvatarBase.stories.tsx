// Third party dependencies.
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { toDataUrl } from '../../../../util/blockies';

// Internal dependencies.
import AvatarBase from './AvatarBase';
import { AvatarBaseSize } from './AvatarBase.types';
import { DUMMY_IMAGE_DATA } from './AvatarBase.constants';

const styles = StyleSheet.create({ imageStyle: { flex: 1 } });

storiesOf('Component Library / AvatarBase', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const sizeSelector = select('Size', AvatarBaseSize, AvatarBaseSize.Md);

    return (
      <AvatarBase size={sizeSelector}>
        <Image
          source={{ uri: toDataUrl(DUMMY_IMAGE_DATA) }}
          style={styles.imageStyle}
        />
      </AvatarBase>
    );
  });
