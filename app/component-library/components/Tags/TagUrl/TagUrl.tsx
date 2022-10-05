/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariants } from '../../Avatars/Avatar';
import Button, { ButtonVariants } from '../../Buttons/Button';
import Text, { TextVariants } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './TagUrl.styles';
import { TagUrlProps } from './TagUrl.types';

const TagUrl = ({ imageSource, label, cta, style, ...props }: TagUrlProps) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base} {...props}>
      <Avatar
        variant={AvatarVariants.Favicon}
        imageSource={imageSource}
        size={AvatarSize.Md}
      />
      <Text style={styles.label} variant={TextVariants.sBodyMD}>
        {label}
      </Text>
      {cta && (
        <Button
          variant={ButtonVariants.Link}
          style={styles.cta}
          onPress={cta.onPress}
        >
          {cta.label}
        </Button>
      )}
    </View>
  );
};

export default TagUrl;
