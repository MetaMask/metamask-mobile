import React from 'react';
import { View } from 'react-native';
import {
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '@react-navigation/native';
import {
  selectFullHandle,
  selectIsProfileEnabled,
} from '../../../../core/redux/slices/userProfile';
import styleSheet from './UsernameBanner.styles.ts';
import { USERNAME_BANNER_TEST_IDS } from './UsernameBanner.testIds.ts';

const UsernameBanner = () => {
  const { styles } = useStyles(styleSheet, { theme: useTheme() });

  const fullHandle = useSelector(selectFullHandle);
  const isProfileEnabled = useSelector(selectIsProfileEnabled);

  // Don't render if profile is not enabled or no username
  if (!isProfileEnabled || !fullHandle) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.container}
        testID={USERNAME_BANNER_TEST_IDS.CONTAINER}
      >
        <Icon
          name={IconName.MetamaskFoxOutline}
          size={IconSize.Sm}
          color={IconColor.PrimaryDefault}
        />
        <Text
          variant={TextVariant.BodySm}
          style={styles.username}
          testID={USERNAME_BANNER_TEST_IDS.USERNAME}
        >
          {fullHandle}
        </Text>
      </View>
    </View>
  );
};

export default UsernameBanner;
