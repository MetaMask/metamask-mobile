import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

import ClipboardManager from '../../../../../../../core/ClipboardManager';

interface CopyIconProps {
  textToCopy: string;
  color: IconColor;
}

const CopyIcon = ({ textToCopy, color }: CopyIconProps) => {
  const copyToClipboard = async () => {
    if (textToCopy) {
      await ClipboardManager.setString(textToCopy);
    }
  };

  return (
    <TouchableOpacity onPress={copyToClipboard}>
      <Icon name={IconName.Copy} size={IconSize.Sm} color={color} />
    </TouchableOpacity>
  );
};

export default CopyIcon;
