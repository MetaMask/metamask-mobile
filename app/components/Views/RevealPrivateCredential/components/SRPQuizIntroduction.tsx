import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonSize,
  ButtonVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextButton,
} from '@metamask/design-system-react-native';
import SecurityQuizLockImage from '../../../../images/reveal_srp_intro.png';
import { strings } from '../../../../../locales/i18n';
import { ExportCredentialsIds } from '../../MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import { SrpQuizGetStartedSelectorsIDs } from '../../Quiz/SRPQuiz/SrpQuizModal.testIds';
import { SRPQuizIntroductionProps } from '../types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const SRPQuizIntroduction = ({
  onGetStarted,
  onLearnMore,
}: SRPQuizIntroductionProps) => {
  const tw = useTailwind();

  return (
    <Box
      testID={ExportCredentialsIds.CONTAINER}
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      paddingTop={8}
      paddingHorizontal={4}
      paddingBottom={6}
      twClassName="flex-1 w-full"
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Image
          source={SecurityQuizLockImage}
          style={tw.style('h-[184px] w-[205px]')}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-6"
        >
          {strings('multichain_accounts.reveal_srp.description')}
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={4}
        twClassName="w-full"
      >
        <Button
          variant={ButtonVariant.Primary}
          onPress={onGetStarted}
          size={ButtonSize.Lg}
          testID={SrpQuizGetStartedSelectorsIDs.BUTTON}
          twClassName="w-full text-center"
        >
          {strings('multichain_accounts.reveal_srp.get_started')}
        </Button>
        <TextButton
          onPress={onLearnMore}
          testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
          twClassName="w-full text-center flex items-center justify-center self-center"
        >
          {strings('multichain_accounts.reveal_srp.learn_more')}
        </TextButton>
      </Box>
    </Box>
  );
};

export default SRPQuizIntroduction;
