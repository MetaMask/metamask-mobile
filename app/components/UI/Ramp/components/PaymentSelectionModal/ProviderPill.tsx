import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import RemoteImage from '../../../../Base/RemoteImage';
import { useTheme } from '../../../../../util/theme';
import type { Provider } from '@metamask/ramps-controller';

interface ProviderPillProps {
  provider: Provider | null;
  onPress?: () => void;
}

const ProviderPill: React.FC<ProviderPillProps> = ({ provider, onPress }) => {
  const { themeAppearance } = useTheme();

  if (!provider) {
    return null;
  }

  const logoUrl = provider.logos?.[themeAppearance];
  const hasLogo = logoUrl && provider.logos?.width && provider.logos?.height;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2 px-3 py-2 rounded-lg bg-muted"
      >
        {hasLogo ? (
          <RemoteImage
            style={{
              width: provider.logos.width,
              height: provider.logos.height,
            }}
            source={{ uri: logoUrl }}
          />
        ) : (
          <Text variant={TextVariant.BodyMDMedium}>{provider.name}</Text>
        )}
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.Default}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default ProviderPill;
