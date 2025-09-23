import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React from 'react';
import { Image, View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import MetalCard from '../../../../../images/metal-card.png';
import { useTheme } from '../../../../../util/theme';
import createStyles, { headerStyle } from './CardWelcome.styles';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardWelcomeSelectors } from '../../../../../../e2e/selectors/Card/CardWelcome.selectors';

const CardWelcome = () => {
  const { goBack } = useNavigation();
  const theme = useTheme();

  const styles = createStyles(theme);

  const handleClose = async () => {
    goBack();
  };

  return (
    <SafeAreaView style={styles.safeAreaView} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.imageWrapper}>
          <Image
            source={MetalCard}
            style={styles.image}
            resizeMode="contain"
            testID={CardWelcomeSelectors.CARD_IMAGE}
          />
        </View>
        <View>
          <Text
            variant={TextVariant.HeadingLG}
            testID={CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT}
          >
            {strings('card.card_onboarding.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            testID={CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT}
          >
            {strings('card.card_onboarding.description')}
          </Text>

          <Button
            variant={ButtonVariants.Primary}
            label={strings('card.card_onboarding.verify_account_button')}
            size={ButtonSize.Lg}
            testID={CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON}
            // Temporary navigation to card home
            onPress={handleClose}
            style={styles.button}
            width={ButtonWidthTypes.Full}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

CardWelcome.navigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => ({
  headerLeft: () => (
    <ButtonIcon
      size={ButtonIconSizes.Md}
      iconName={IconName.Setting}
      style={headerStyle.invisibleIcon}
    />
  ),
  headerTitle: () => (
    <Text
      variant={TextVariant.HeadingSM}
      style={headerStyle.title}
      testID={'card-view-title'}
    >
      {strings('card.card')}
    </Text>
  ),
  headerRight: () => (
    <ButtonIcon
      style={headerStyle.icon}
      size={ButtonIconSizes.Lg}
      iconName={IconName.Close}
      onPress={() => navigation.goBack()}
    />
  ),
});

export default CardWelcome;
