import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import { strings } from '../../../../../locales/i18n';
import { isMfaKitEnabled, useMfa } from '../../../../util/identity/mfa';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { MfaSettingsSelectorsIDs } from '../Mfa.testIds';
import MfaQaPresets from './MfaQaPresets';

const getEmailSubtitle = (credential?: EnrolledCredential) => {
  if (credential?.type !== 'email_otp') {
    return undefined;
  }
  if (credential.status === 'pending') {
    return strings('mfa.settings.email_pending');
  }
  return credential.email ?? strings('mfa.settings.email_linked');
};

/**
 * The profile's verification methods, and the QA presets outside production.
 */
const MfaSettings = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { credentials, enroll } = useMfa();
  const email = credentials.find(({ type }) => type === 'email_otp');
  const isEmailActive = email?.status === 'active';

  useEffect(() => {
    mobileMfaControllerAdapter
      .refreshEnrolledCredentials()
      .catch(() => undefined);
  }, []);

  const setUpEmail = () => {
    enroll({
      method: 'email_otp',
      reason: { operation: 'settings.addEmail' },
    }).catch(() => undefined);
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={MfaSettingsSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings('mfa.settings.title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView contentContainerStyle={tw.style('p-4 gap-6')}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('mfa.settings.description')}
        </Text>
        <Box
          twClassName="flex-row items-center gap-3"
          testID={MfaSettingsSelectorsIDs.EMAIL_ROW}
        >
          <Icon name={IconName.Mail} color={IconColor.IconAlternative} />
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('mfa.method_email')}
            </Text>
            {email ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {getEmailSubtitle(email)}
              </Text>
            ) : null}
          </Box>
          {isEmailActive ? (
            <Icon name={IconName.Check} color={IconColor.SuccessDefault} />
          ) : (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              onPress={setUpEmail}
              testID={MfaSettingsSelectorsIDs.EMAIL_BUTTON}
            >
              {strings(
                email ? 'mfa.settings.finish_setup' : 'mfa.settings.set_up',
              )}
            </Button>
          )}
        </Box>
        {isMfaKitEnabled() ? <MfaQaPresets /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MfaSettings;
