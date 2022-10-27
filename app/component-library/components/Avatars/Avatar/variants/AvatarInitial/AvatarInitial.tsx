// Third party dependencies.
import React from 'react';
import Text from '../../../../Texts/Text';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import { AvatarSizes } from '../../Avatar.types';
import AvatarBase from '../../foundation/AvatarBase';

// Internal dependencies.
import styleSheet from './AvatarInitial.styles';
import { AvatarInitialProps } from './AvatarInitial.types';
import {
  TEXT_VARIANT_BY_AVATAR_SIZE,
  AVATAR_INITIAL_TEST_ID,
  AVATAR_INITIAL_TEXT_TEST_ID,
} from './AvatarInitial.constants';

const AvatarInitial = ({
  style,
  initial,
  size = AvatarSizes.Md,
  ...props
}: AvatarInitialProps) => {
  const { styles } = useStyles(styleSheet, { style, size });
  const initialFirstLetter: string = initial?.[0];

  return (
    <AvatarBase style={styles.base} testID={AVATAR_INITIAL_TEST_ID} {...props}>
      <Text
        variant={TEXT_VARIANT_BY_AVATAR_SIZE[size]}
        testID={AVATAR_INITIAL_TEXT_TEST_ID}
      >
        {initialFirstLetter}
      </Text>
    </AvatarBase>
  );
};

export default AvatarInitial;
