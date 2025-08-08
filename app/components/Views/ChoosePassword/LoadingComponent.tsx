import React from 'react';
import LottieView, { AnimationObject } from 'lottie-react-native';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

import { useTheme } from '../../../util/theme';
import { ONBOARDING } from '../../../constants/navigation';
import fox from '../../../animations/Searching_Fox.json';

interface LoadingComponentProps {
  previousScreen: string;
}

const createStyles = () =>
  StyleSheet.create({
    loadingWrapper: {
      paddingHorizontal: 40,
      paddingBottom: 30,
      alignItems: 'center',
      flex: 1,
    },
    foxWrapper: {
      marginTop: 30,
      marginBottom: 30,
    },
    image: {
      alignSelf: 'center',
    },
    title: {
      justifyContent: 'flex-start',
      textAlign: 'left',
      fontSize: 32,
    },
    subtitle: {
      textAlign: 'center',
    },
  });

export const LoadingComponent = (props: LoadingComponentProps) => {
  const { colors } = useTheme();

  const foxWidth = Dimensions.get('window').width * 0.5;
  const styles = createStyles();
  const { previousScreen } = props;

  return (
    <View style={styles.loadingWrapper}>
      <View style={styles.foxWrapper}>
        <LottieView
          style={{ ...styles.image, width: foxWidth, height: foxWidth }}
          autoPlay
          loop
          source={fox as AnimationObject}
          resizeMode="contain"
        />
      </View>
      <ActivityIndicator size="large" color={colors.text.default} />
      <Text
        variant={TextVariant.HeadingLG}
        style={styles.title}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {strings(
          previousScreen === ONBOARDING
            ? 'create_wallet.title'
            : 'secure_your_wallet.creating_password',
        )}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.subtitle}>
        {strings('create_wallet.subtitle')}
      </Text>
    </View>
  );
};
