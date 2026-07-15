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

/**
 * @deprecated This component is unused and will be removed.
 * Please use `BannerBase` from `@metamask/design-system-react-native` instead.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BannerBase/README.md}
 * @since @metamask/design-system-react-native@0.11.0
 */
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
