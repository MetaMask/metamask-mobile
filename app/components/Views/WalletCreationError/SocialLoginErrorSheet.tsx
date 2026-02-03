import React, { useCallback } from 'react';
import { View, Image, Linking, SafeAreaView } from 'react-native';
import { useNavigation, ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { useStyles } from '../../../component-library/hooks/useStyles';
import AppConstants from '../../../core/AppConstants';
import styleSheet from './SocialLoginErrorSheet.styles';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const FOX_LOGO = require('../../../images/branding/fox.png');

interface SocialLoginErrorSheetProps {
  error: Error;
}

const SocialLoginErrorSheet: React.FC<SocialLoginErrorSheetProps> = () => {
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const { styles } = useStyles(styleSheet, {});

  const handleTryAgain = useCallback(() => {
    navigation.reset({
      routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
    });
  }, [navigation]);

  const handleContactSupport = useCallback(() => {
    Linking.openURL(AppConstants.REVIEW_PROMPT.SUPPORT);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.foxContainer}>
        <Image source={FOX_LOGO} style={styles.foxLogo} resizeMode="contain" />
      </View>

      <View style={styles.sheetContent}>
        <View style={styles.handleBar} />

        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.Error}
          style={styles.warningIcon}
        />

        <Text variant={TextVariant.HeadingMD} style={styles.title}>
          {strings('wallet_creation_error.title')}
        </Text>

        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings('wallet_creation_error.social_login_description_part1')}{' '}
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Primary}
            onPress={handleContactSupport}
          >
            {strings('wallet_creation_error.metamask_support')}
          </Text>
          {'.'}
        </Text>

        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('wallet_creation_error.try_again')}
          onPress={handleTryAgain}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
};

export default SocialLoginErrorSheet;
