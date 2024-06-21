import { Image } from 'react-native';
import React from 'react';
import images from 'images/image-icons';

interface ImageIconPropTypes {
  image: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style: any;
}

const ImageIcon = (props: ImageIconPropTypes) => {
  const { image, style } = props;

  if (!image) return null;
  const source = images[image];
  if (!source) {
    return null;
  }

  return <Image source={source} style={style} />;
};

export default ImageIcon;
