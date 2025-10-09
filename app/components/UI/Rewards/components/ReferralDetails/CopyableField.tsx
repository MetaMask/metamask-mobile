import React, { useState } from 'react';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon/Icon.types';
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
          <Text variant={TextVariant.BodySm}>{value || '-'}</Text>
        )}
      </Box>
      <ButtonIcon
        iconName={isCopied ? IconName.CopySuccess : IconName.Copy}
        size={ButtonIconSizes.Md}
        onPress={handleCopy}
        isDisabled={!value}
        accessibilityLabel={isCopied ? 'Copied' : 'Copy'}
        accessibilityRole="button"
        testID="copy-button"
        iconColor={isCopied ? IconColor.Success : undefined}
      />
    </Box>
  );
};

export default CopyableField;
