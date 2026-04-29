import React, { useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';

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
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (value && onCopy) {
      onCopy();
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  return (
    <Box twClassName="flex-col gap-1">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {label}
      </Text>
      <Box
        twClassName="flex-1 bg-muted rounded-lg px-4 py-1 border border-solid border-muted"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Box twClassName="min-w-0 flex-1">
          {valueLoading ? (
            <Skeleton height={24} width={75} />
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {value || '-'}
            </Text>
          )}
        </Box>
        <ButtonIcon
          iconName={isCopied ? IconName.Confirmation : IconName.Copy}
          size={ButtonIconSize.Md}
          onPress={handleCopy}
          isDisabled={!value}
          accessibilityLabel={isCopied ? 'Copied' : 'Copy'}
          accessibilityRole="button"
          testID="copy-button"
          iconProps={isCopied ? { color: IconColor.SuccessDefault } : undefined}
        />
      </Box>
    </Box>
  );
};

export default CopyableField;
