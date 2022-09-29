/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { AvatarBaseSize } from '../../Avatars/AvatarBase';
import AvatarFavicon from '../../Avatars/AvatarFavicon';
import ButtonLink from '../../Buttons/ButtonLink';
import Text, { TextVariant } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './TagUrl.styles';
import { TagUrlProps } from './TagUrl.types';

const TagUrl = ({ imageSource, label, cta, style, ...props }: TagUrlProps) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base} {...props}>
      <AvatarFavicon imageSource={imageSource} size={AvatarBaseSize.Md} />
      <Text style={styles.label} variant={TextVariant.sBodyMD}>
        {label}
      </Text>
      {cta && (
        <ButtonLink style={styles.cta} onPress={cta.onPress}>
          {cta.label}
        </ButtonLink>
      )}
    </View>
  );
};

export default TagUrl;
