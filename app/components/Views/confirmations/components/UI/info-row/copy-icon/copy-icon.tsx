import React from 'react';
import TouchableOpacity from '../../../../../../Base/TouchableOpacity';
import Icon from '../../../../../../../component-library/components/Icons/Icon';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon/Icon.types';
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
