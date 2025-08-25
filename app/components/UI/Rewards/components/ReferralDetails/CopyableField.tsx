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
import { Skeleton } from '../../../../../component-library/components/Skeleton';

interface CopyableFieldProps {
  label: string;
  value?: string | null;
  onCopy?: () => void;
  valueLoading?: boolean;
}

const CopyableField: React.FC<CopyableFieldProps> = ({
  label,
  value,
  onCopy,
  valueLoading,
}) => (
  <Box
    twClassName="bg-muted border-muted rounded-md px-4 py-3"
    flexDirection={BoxFlexDirection.Row}
  >
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {label}
      </Text>
      {valueLoading ? (
        <Skeleton height={24} width={75} />
      ) : (
        <Text variant={TextVariant.BodyMd}>{value || '-'}</Text>
      )}
    </Box>
    <ButtonIcon
      iconName={IconName.Copy}
      size={ButtonIconSize.Md}
      onPress={onCopy}
      disabled={!value}
      accessibilityLabel="Copy"
      accessibilityRole="button"
      testID="copy-button"
    />
  </Box>
);

export default CopyableField;
