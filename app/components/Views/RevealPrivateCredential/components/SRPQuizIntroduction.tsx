import React from 'react';
import { Image } from 'react-native';
import { ButtonSize } from '../../../../component-library/components/Buttons/Button';
import ButtonPrimary from '../../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Box } from '../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import SecurityQuizLockImageLight from '../../../../images/reveal_srp_light.png';
import SecurityQuizLockImageDark from '../../../../images/reveal_srp.png';
import { strings } from '../../../../../locales/i18n';
import { ExportCredentialsIds } from '../../MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import { SrpQuizGetStartedSelectorsIDs } from '../../Quiz/SRPQuiz/SrpQuizModal.testIds';
import { SRPQuizIntroductionProps } from '../types';
import { useTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';

const SRPQuizIntroduction = ({
  onGetStarted,
  onLearnMore,
  styles,
}: SRPQuizIntroductionProps) => {
  const theme = useTheme();
  const { themeAppearance } = theme;
  const SecurityQuizLockImage =
    themeAppearance === AppThemeKey.dark
      ? SecurityQuizLockImageDark
      : SecurityQuizLockImageLight;
  return (
    <Box
      testID={ExportCredentialsIds.CONTAINER}
      style={styles.quizContainer}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.spaceBetween}
    >
      <Box
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
      >
        <Image source={SecurityQuizLockImage} height={220} width={190} />
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.quizDescription}
        >
          {strings('multichain_accounts.reveal_srp.description')}
        </Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
        style={styles.quizButtonContainer}
        gap={16}
      >
        <ButtonPrimary
          onPress={onGetStarted}
          size={ButtonSize.Lg}
          label={strings('multichain_accounts.reveal_srp.get_started')}
          testID={SrpQuizGetStartedSelectorsIDs.BUTTON}
          style={styles.button}
        />
        <ButtonLink
          onPress={onLearnMore}
          label={strings('multichain_accounts.reveal_srp.learn_more')}
          testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
          style={styles.button}
        />
      </Box>
    </Box>
  );
};

export default SRPQuizIntroduction;
