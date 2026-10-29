import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { useMfa } from '../../../../util/identity/mfa';
import { getActivePasskeys } from '../credentials';
import { getAddedOn, getPasskeyName } from '../labels';
import { MfaPasskeysSelectorsIDs } from '../Mfa.testIds';

/**
 * The profile's passkeys: each opens its details, and the footer adds
 * another.
 */
const MfaPasskeys = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { credentials, enroll } = useMfa();
  const passkeys = getActivePasskeys(credentials);

  const addPasskey = () => {
    enroll({
      method: 'passkey',
      reason: { operation: 'settings.addPasskey' },
    }).catch(() => undefined);
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={MfaPasskeysSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings('mfa.settings.passkeys')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView>
        {passkeys.map((passkey, index) => (
          <ListItem
            key={index}
            isInteractive
            avatar={<AvatarIcon iconName={IconName.Key} />}
            title={getPasskeyName(passkey, index)}
            description={getAddedOn(passkey)}
            endAccessory={
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            onPress={() =>
              navigation.navigate(Routes.MFA.METHOD_DETAILS, {
                method: 'passkey',
                index,
              })
            }
            testID={`${MfaPasskeysSelectorsIDs.ROW}-${index}`}
          />
        ))}
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={addPasskey}
          testID={MfaPasskeysSelectorsIDs.ADD_BUTTON}
        >
          {strings('mfa.settings.add_passkey')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default MfaPasskeys;
