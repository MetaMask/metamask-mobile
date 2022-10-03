/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { AvatarSize } from '../../Avatars/Avatar';
import AvatarFavicon from '../../Avatars/Avatar/variants/AvatarFavicon';
import ButtonLink from '../../Buttons/Button/variants/ButtonLink';
import Text, { TextVariant } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './TagUrl.styles';
import { TagUrlProps } from './TagUrl.types';

const TagUrl = ({ imageSource, label, cta, style, ...props }: TagUrlProps) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base} {...props}>
      <AvatarFavicon imageSource={imageSource} size={AvatarSize.Md} />
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
