/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Image, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BannerBase from '../../foundation/BannerBase';

// Internal dependencies.
import styleSheet from './BannerTip.styles';
import { BannerTipProps } from './BannerTip.types';
import {
  DEFAULT_BANNERTIP_LOGOTYPE,
  IMAGESOURCE_BY_BANNERTIPLOGOTYPE,
  BANNERTIP_TEST_ID,
} from './BannerTip.constants';

const BannerTip: React.FC<BannerTipProps> = ({
  style,
  logoType = DEFAULT_BANNERTIP_LOGOTYPE,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });

  const foxLogo = (
    <View style={styles.logoContainer}>
      <Image
        source={IMAGESOURCE_BY_BANNERTIPLOGOTYPE[logoType]}
        style={styles.logo}
        resizeMode={'contain'}
      />
    </View>
  );

  return (
    <BannerBase
      style={styles.base}
      startAccessory={foxLogo}
      testID={BANNERTIP_TEST_ID}
      {...props}
    />
  );
};

export default BannerTip;
