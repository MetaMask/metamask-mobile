import React, { useState } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  TextField,
  Button,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { AddDeviceSettingsStep } from '../constant';

interface EnterPasswordProps {
  onContinue: (type: AddDeviceSettingsStep) => void;
}

const EnterPassword = ({ onContinue }: EnterPasswordProps) => {
  const tw = useTailwind();
  const [password, setPassword] = useState('');
  return (
    <Box twClassName="p-4 pt-0 flex-1 flex-col gap-4">
      <Text
        variant={TextVariant.HeadingLg}
        twClassName="text-[26px]"
        color={TextColor.TextDefault}
        fontWeight={FontWeight.Bold}
      >
        {strings('app_settings.add_device.enter_your_password')}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('app_settings.add_device.enter_your_password_desc')}
      </Text>
      <TextField value={password} onChangeText={setPassword} />
      <Button
        twClassName="w-full mt-auto"
        onPress={() => onContinue(AddDeviceSettingsStep.ADD_WALLETS)}
      >
        {strings('app_settings.add_device.continue')}
      </Button>
    </Box>
  );
};

export default EnterPassword;
