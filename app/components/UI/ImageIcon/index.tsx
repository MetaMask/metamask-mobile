import { Image, type ImageSourcePropType } from 'react-native';
import React from 'react';
import images from 'images/image-icons';

interface ImageIconPropTypes {
  image: string | ImageSourcePropType;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style: any;
}

const ImageIcon = (props: ImageIconPropTypes) => {
  const { image, style } = props;

  if (!image) return null;

  let source: ImageSourcePropType | undefined;
  if (typeof image === 'string') {
    source = images[image];
  } else {
    source = image;
  }

  if (!source) {
    return null;
  }

  return <Image source={source} style={style} />;
};

export default ImageIcon;
