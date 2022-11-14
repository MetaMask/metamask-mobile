// Third party dependencies.
import React from 'react';
import Text from '../../../../Texts/Text';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import AvatarBase from '../../foundation/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import styleSheet from './AvatarInitial.styles';
import { AvatarInitialProps } from './AvatarInitial.types';
import {
  TEXT_VARIANT_BY_AVATAR_SIZE,
  AVATAR_INITIAL_TEST_ID,
  AVATAR_INITIAL_TEXT_TEST_ID,
} from './AvatarInitial.constants';

const AvatarInitial = ({
  initial,
  initialColor,
  backgroundColor,
  size = DEFAULT_AVATAR_SIZE,
  ...props
}: AvatarInitialProps) => {
  const { styles } = useStyles(styleSheet, {
    size,
    initialColor,
    backgroundColor,
  });
  const initialFirstLetter: string = initial?.[0];

  return (
    <AvatarBase
      style={styles.base}
      size={size}
      {...props}
      testID={AVATAR_INITIAL_TEST_ID}
    >
      <Text
        style={styles.initial}
        variant={TEXT_VARIANT_BY_AVATAR_SIZE[size]}
        testID={AVATAR_INITIAL_TEXT_TEST_ID}
      >
        {initialFirstLetter}
      </Text>
    </AvatarBase>
  );
};

export default AvatarInitial;
