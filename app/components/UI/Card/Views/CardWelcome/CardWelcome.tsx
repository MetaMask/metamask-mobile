import { useNavigation } from '@react-navigation/native';
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
import createStyles from './CardWelcome.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardWelcomeSelectors } from '../../../../../../e2e/selectors/Card/CardWelcome.selectors';
import Routes from '../../../../../constants/navigation/Routes';

const CardWelcome = () => {
  const { navigate } = useNavigation();
  const theme = useTheme();

  const styles = createStyles(theme);

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
            onPress={() => navigate(Routes.CARD.AUTHENTICATION)}
            style={styles.button}
            width={ButtonWidthTypes.Full}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CardWelcome;
