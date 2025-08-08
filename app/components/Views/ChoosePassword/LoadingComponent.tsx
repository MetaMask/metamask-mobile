import React from 'react';
import LottieView, { AnimationObject } from 'lottie-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

import { useTheme } from '../../../util/theme';
import { ONBOARDING } from '../../../constants/navigation';
import fox from '../../../animations/Searching_Fox.json';
import Device from '../../../util/device';

interface LoadingComponentProps {
  previousScreen: string;
}

const createStyles = () =>
  StyleSheet.create({
    loadingWrapper: {
      paddingHorizontal: 16,
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'flex-start',
      alignContent: 'center',
      flex: 1,
      rowGap: 24,
    },
    foxWrapper: {
      width: Device.isMediumDevice() ? 180 : 220,
      height: Device.isMediumDevice() ? 180 : 220,
    },
    image: {
      alignSelf: 'center',
      width: Device.isMediumDevice() ? 180 : 220,
      height: Device.isMediumDevice() ? 180 : 220,
    },
    loadingTextContainer: {
      display: 'flex',
      flexDirection: 'column',
      rowGap: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export const LoadingComponent = (props: LoadingComponentProps) => {
  const { colors } = useTheme();

  const styles = createStyles();
  const { previousScreen } = props;

  return (
    <View style={styles.loadingWrapper}>
      <View style={styles.foxWrapper}>
        <LottieView
          style={{ ...styles.image }}
          autoPlay
          loop
          source={fox as AnimationObject}
          resizeMode="contain"
        />
      </View>
      <ActivityIndicator size="large" color={colors.text.default} />
      <View style={styles.loadingTextContainer}>
        <Text
          variant={TextVariant.HeadingLG}
          color={colors.text.default}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {strings(
            previousScreen === ONBOARDING
              ? 'create_wallet.title'
              : 'secure_your_wallet.creating_password',
          )}
        </Text>
        <Text variant={TextVariant.BodyMD} color={colors.text.alternative}>
          {strings('create_wallet.subtitle')}
        </Text>
      </View>
    </View>
  );
};
