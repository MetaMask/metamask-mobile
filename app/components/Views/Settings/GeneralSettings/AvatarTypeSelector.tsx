import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  AvatarAccount,
  AvatarBaseSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import type { GeneralSettingsStyles } from './GeneralSettings.styles';

interface AvatarTypeSelectorProps {
  address: string;
  onChange: (type: AvatarAccountType) => void;
  selectedType: AvatarAccountType;
  styles: GeneralSettingsStyles;
}

const FALLBACK_ADDRESS = '0x0000000000000000000000000000000000000000';

const avatarOptions = [
  { label: 'Polycons', type: AvatarAccountType.Maskicon },
  {
    label: strings('app_settings.jazzicons'),
    type: AvatarAccountType.JazzIcon,
  },
  {
    label: strings('app_settings.blockies'),
    type: AvatarAccountType.Blockies,
  },
];

export const AvatarTypeSelector = ({
  address,
  onChange,
  selectedType,
  styles,
}: AvatarTypeSelectorProps) => (
  <View style={styles.identiconContainer}>
    {avatarOptions.map(({ label, type }) => (
      <TouchableOpacity
        key={type}
        onPress={() => onChange(type)}
        style={styles.identiconRow}
      >
        <View
          style={[
            styles.avatarWrapper,
            selectedType === type
              ? styles.selectedAvatarWrapper
              : styles.unselectedAvatarWrapper,
          ]}
        >
          <AvatarAccount
            address={address || FALLBACK_ADDRESS}
            variant={getAvatarAccountVariant(type)}
            size={AvatarBaseSize.Lg}
          />
        </View>
        <Text variant={TextVariant.BodyMd} style={styles.identiconText}>
          {label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);
