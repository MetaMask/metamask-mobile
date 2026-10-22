import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ContentVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { isMfaKitEnabled, useMfa } from '../../../../util/identity/mfa';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import type { MfaMethod } from '../../../../util/identity/mfa/engine/types';
import { getActiveCredentials, getActivePasskeys } from '../credentials';
import { getMethodLabel } from '../labels';
import { MfaSettingsSelectorsIDs } from '../Mfa.testIds';
import MfaQaPresets from './MfaQaPresets';

const ROW_TEST_IDS: Record<MfaMethod, string> = {
  passkey: MfaSettingsSelectorsIDs.PASSKEY_ROW,
  email_otp: MfaSettingsSelectorsIDs.EMAIL_ROW,
  totp: MfaSettingsSelectorsIDs.TOTP_ROW,
};

const ADD_OPERATIONS: Record<MfaMethod, string> = {
  passkey: 'settings.addPasskey',
  email_otp: 'settings.addEmail',
  totp: 'settings.addAuthenticatorApp',
};

/**
 * The profile's verification methods: "Add" sets one up, the chevron opens
 * one that is set up. Passkeys open their list, where more can be added.
 */
const MfaSettings = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { credentials, enroll } = useMfa();
  const passkeyCount = getActivePasskeys(credentials).length;
  const activeTypes = new Set(
    getActiveCredentials(credentials).map(({ type }) => type),
  );

  useEffect(() => {
    mobileMfaControllerAdapter
      .refreshEnrolledCredentials()
      .catch(() => undefined);
  }, []);

  const add = (method: MfaMethod) => {
    enroll({
      method,
      reason: { operation: ADD_OPERATIONS[method] },
    }).catch(() => undefined);
  };

  const rows: {
    method: MfaMethod;
    label: string;
    isSetUp: boolean;
    summary?: string;
  }[] = [
    {
      method: 'passkey',
      label: strings('mfa.settings.passkeys'),
      isSetUp: passkeyCount > 0,
      summary: strings('mfa.settings.passkey_count', { count: passkeyCount }),
    },
    {
      method: 'email_otp',
      label: getMethodLabel('email_otp'),
      isSetUp: activeTypes.has('email_otp'),
    },
    {
      method: 'totp',
      label: getMethodLabel('totp'),
      isSetUp: activeTypes.has('totp'),
    },
  ];

  const open = (method: MfaMethod, isSetUp: boolean) => {
    if (!isSetUp) {
      add(method);
    } else if (method === 'passkey') {
      navigation.navigate(Routes.MFA.PASSKEYS);
    } else {
      navigation.navigate(Routes.MFA.METHOD_DETAILS, { method, index: 0 });
    }
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={MfaSettingsSelectorsIDs.CONTAINER}
    >
      <HeaderStandard onBack={() => navigation.goBack()} includesTopInset />
      <ScrollView contentContainerStyle={tw.style('pb-4')}>
        <Text variant={TextVariant.HeadingLg} twClassName="px-4 pb-2">
          {strings('mfa.settings.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="px-4 pb-2"
        >
          {strings('mfa.settings.notice')}
        </Text>
        {rows.map(({ method, label, isSetUp, summary }) => (
          <ListItem
            key={method}
            isInteractive
            variant={ContentVariant.OneLine}
            title={label}
            value={isSetUp ? summary : strings('mfa.settings.add')}
            valueProps={{ color: TextColor.TextAlternative }}
            endAccessory={
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            accessoryGap={2}
            onPress={() => open(method, isSetUp)}
            testID={ROW_TEST_IDS[method]}
          />
        ))}
        {isMfaKitEnabled() ? <MfaQaPresets /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MfaSettings;
