// Third party dependencies.
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean, select } from '@storybook/addon-knobs';

// External dependencies.
import { toDataUrl } from '../../../../util/blockies';
import AvatarNetwork from '../AvatarNetwork/AvatarNetwork';
import { TEST_IMAGE_SOURCE } from '../AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import AvatarBase from './AvatarBase';
import { AvatarBaseSize } from './AvatarBase.types';
import { DUMMY_IMAGE_DATA } from './AvatarBase.constants';

const styles = StyleSheet.create({ imageStyle: { flex: 1 } });

storiesOf('Component Library / AvatarBase', module).add('Default', () => {
  const sizeSelector = select('Size', AvatarBaseSize, AvatarBaseSize.Md);
  const includesBadge = boolean('Includes badge?', false);

  const badgeContent = includesBadge ? (
    <AvatarNetwork
      size={AvatarBaseSize.Xs}
      name={'Ethereum'}
      imageSource={TEST_IMAGE_SOURCE}
    />
  ) : null;
  return (
    <AvatarBase size={sizeSelector} badge={{ content: badgeContent }}>
      <Image
        source={{ uri: toDataUrl(DUMMY_IMAGE_DATA) }}
        style={styles.imageStyle}
      />
    </AvatarBase>
  );
});
