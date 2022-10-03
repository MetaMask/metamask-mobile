// Third party dependencies.
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { toDataUrl } from '../../../../../../util/blockies';

// Internal dependencies.
import AvatarBase from './AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import { DUMMY_IMAGE_DATA } from './AvatarBase.constants';

const styles = StyleSheet.create({ imageStyle: { flex: 1 } });

storiesOf('Design System / AvatarBase', module).add('Default', () => {
  const sizeSelector = select('Size', AvatarSize, AvatarSize.Md);

  return (
    <AvatarBase size={sizeSelector}>
      <Image
        source={{ uri: toDataUrl(DUMMY_IMAGE_DATA) }}
        style={styles.imageStyle}
      />
    </AvatarBase>
  );
});
