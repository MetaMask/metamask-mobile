import React, { useContext, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { isMfaDevBuild, useMfa } from '../../../../util/identity/mfa';
import { useTheme } from '../../../../util/theme';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { selectMfaUiKitMethods } from '../../../../selectors/featureFlagController/mfaUiKit';
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

const ADD_SUCCESS_MESSAGE_KEYS: Record<MfaMethod, string> = {
  passkey: 'mfa.settings.passkey_added',
  email_otp: 'mfa.settings.email_verified',
  totp: 'mfa.settings.totp_added',
};

/**
 * The profile's verification methods: "Add" sets one up, the chevron opens
 * one that is set up. Passkeys open their list, where more can be added.
 * Email is hidden for social login users: their login email is not a real
 * second factor.
 */
const MfaSettings = () => {
  const tw = useTailwind();
  const theme = useTheme();
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const { credentials, enroll } = useMfa();
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);
  const methods = useSelector(selectMfaUiKitMethods);
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
    })
      .then(() => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [{ label: strings(ADD_SUCCESS_MESSAGE_KEYS[method]) }],
          iconName: ToastIconName.Confirmation,
          iconColor: theme.colors.success.default,
          hasNoTimeout: false,
        });
      })
      .catch(() => undefined);
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
  const visibleRows = rows.filter(
    ({ method, isSetUp }) =>
      !(isSocialLogin && method === 'email_otp') &&
      (isSetUp || methods.includes(method)),
  );

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
        {visibleRows.map(({ method, label, isSetUp, summary }) => (
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
        {isMfaDevBuild() ? <MfaQaPresets /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MfaSettings;
