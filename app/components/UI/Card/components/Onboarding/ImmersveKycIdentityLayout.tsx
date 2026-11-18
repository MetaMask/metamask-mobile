import React, { type ReactElement } from 'react';
import { ScrollView, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import ImmersveVerifyingIdentityAnimation from './ImmersveVerifyingIdentityAnimation';

export interface ImmersveKycIdentityLayoutProps {
  title: string;
  description: string;
  descriptionTestID?: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  buttonTestID?: string;
  reasonLine?: string | null;
  /** Defaults to the processing screen's illustration id. */
  illustrationTestID?: string;
}

/**
 * Verifying, Finish verifying, retry, the processing errors, and the KYC
 * webview's permission and load errors share this layout.
 */
const ImmersveKycIdentityLayout = ({
  title,
  description,
  descriptionTestID = 'onboarding-description',
  buttonLabel,
  onButtonPress,
  buttonTestID,
  reasonLine,
  illustrationTestID = 'immersve-kyc-processing-illustration',
}: ImmersveKycIdentityLayoutProps): ReactElement => {
  const tw = useTailwind();

  return (
    <View style={tw.style('flex-1')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={title}
          bottomLabel={description}
          titleProps={{
            twClassName: 'text-center',
            testID: 'onboarding-title',
          }}
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelProps={{
            twClassName: 'text-center',
            testID: descriptionTestID,
          }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="mb-5 w-full overflow-hidden"
              testID={illustrationTestID}
            >
              <ImmersveVerifyingIdentityAnimation />
            </Box>
          }
        />
        {reasonLine ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4 text-center"
            testID="immersve-kyc-processing-reason"
          >
            {reasonLine}
          </Text>
        ) : null}
      </ScrollView>
      {buttonLabel ? (
        <Box twClassName="gap-2 px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onButtonPress}
            testID={buttonTestID}
          >
            {buttonLabel}
          </Button>
        </Box>
      ) : null}
    </View>
  );
};

export default ImmersveKycIdentityLayout;
