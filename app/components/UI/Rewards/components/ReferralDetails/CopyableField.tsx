import React from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface CopyableFieldProps {
  label: string;
  value: string | null;
  onCopy?: () => void;
}

const CopyableField: React.FC<CopyableFieldProps> = ({
  label,
  value,
  onCopy,
}) => (
  <Box
    twClassName="bg-muted border-muted rounded-md px-4 py-3"
    flexDirection={BoxFlexDirection.Row}
  >
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Text variant={TextVariant.BodyMd}>{value}</Text>
    </Box>
    <ButtonIcon
      iconName={IconName.Copy}
      size={ButtonIconSize.Md}
      onPress={onCopy}
      disabled={!value}
    />
  </Box>
);

export default CopyableField;
