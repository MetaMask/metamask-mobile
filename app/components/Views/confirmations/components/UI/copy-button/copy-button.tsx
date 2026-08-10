import React, { useCallback, useState } from 'react';

import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import ClipboardManager from '../../../../../../core/ClipboardManager';

interface CopyButtonProps {
  copyText: string;
  testID?: string;
  size?: ButtonIconSize;
  iconColor?: IconColor;
}

const CopyButton = ({
  copyText,
  testID,
  size = ButtonIconSize.Md,
  iconColor = IconColor.IconAlternative,
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copyMessage = useCallback(async () => {
    await ClipboardManager.setString(copyText);
    setCopied(true);
  }, [copyText, setCopied]);

  return (
    <ButtonIcon
      iconProps={{ color: iconColor }}
      size={size}
      onPress={copyMessage}
      iconName={copied ? IconName.CopySuccess : IconName.Copy}
      testID={testID ?? 'copyButtonTestId'}
    />
  );
};

export default CopyButton;
