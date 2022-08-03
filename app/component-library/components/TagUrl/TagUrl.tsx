/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks';
import { AvatarSize } from '../Avatar';
import BaseText, { BaseTextVariant } from '../BaseText';
import AvatarFavicon from '../AvatarFavicon';
import Link from '../Link';
import styleSheet from './TagUrl.styles';
import { TagUrlProps } from './TagUrl.types';

const TagUrl = ({ url, label, cta, style, ...props }: TagUrlProps) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base} {...props}>
      <AvatarFavicon imageUrl={url} size={AvatarSize.Md} />
      <BaseText style={styles.label} variant={BaseTextVariant.sBodyMD}>
        {label}
      </BaseText>
      {cta ? (
        <Link style={styles.cta} onPress={cta.onPress}>
          {cta.label}
        </Link>
      ) : null}
    </View>
  );
};

export default TagUrl;
