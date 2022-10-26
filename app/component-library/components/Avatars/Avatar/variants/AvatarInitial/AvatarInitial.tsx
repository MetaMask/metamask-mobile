// Third party dependencies.
import React from 'react';
import Text from '../../../../Texts/Text';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import { AvatarSize } from '../../Avatar.types';
import AvatarBase from '../../foundation/AvatarBase';

// Internal dependencies.
import styleSheet from './AvatarInitial.styles';
import { AvatarInitialProps } from './AvatarInitial.types';
import { TEXT_VARIANT_BY_AVATAR_SIZE } from './AvatarInitial.constants';

const AvatarInitial = ({
  style,
  initial,
  size = AvatarSize.Md,
  ...props
}: AvatarInitialProps) => {
  const { styles } = useStyles(styleSheet, { style, size });
  const initialFirstLetter: string = initial?.[0];

  return (
    <AvatarBase style={styles.base} {...props}>
      <Text variant={TEXT_VARIANT_BY_AVATAR_SIZE[size]}>
        {initialFirstLetter}
      </Text>
    </AvatarBase>
  );
};

export default AvatarInitial;
