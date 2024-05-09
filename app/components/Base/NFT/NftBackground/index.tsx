import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import FastImage from 'react-native-fast-image';

import { BaseNft, BaseNftProps } from '../BaseNft';
import { defaultImages } from '../contants';

const GenericNftBackground = {
  uri: defaultImages.backgrounds.bg1,
};

const styles = StyleSheet.create({
  background: {
    aspectRatio: 1.2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: Dimensions.get('window').width,
  },
});

export function NftBackground({
  image,
  ...props
}: {
  image?: string;
} & BaseNftProps) {
  return (
    <FastImage
      source={image ? { uri: image } : require('./foxRevamp.png')}
      style={styles.background}
    />
  );
}
