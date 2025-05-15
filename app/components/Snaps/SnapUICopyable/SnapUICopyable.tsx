import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../core/ClipboardManager';
import { strings } from '../../../../locales/i18n';

import { useStyles } from '../../../component-library/hooks/useStyles';
import styleSheet from './SnapUICopyable.styles';

interface SnapUICopyableProps {
  text: string;
  sensitive?: boolean;
}

export const SnapUICopyable: React.FC<SnapUICopyableProps> = ({
  text,
  sensitive = false,
}) => {
  const [isVisible, setIsVisible] = useState(!sensitive);
  const [isClicked, setIsClicked] = useState(false);
  const { styles } = useStyles(styleSheet, {
    sensitive,
    isVisible,
  });

  const SECOND = 1000;
  const startTimeout = () =>
    setTimeout(() => setIsClicked(false), 3 * SECOND, false);

  const handleVisibilityClick = () => {
    setIsVisible((state) => !state);
  };

  const handleCopyPress = async () => {
    await ClipboardManager.setString(text);
    setIsClicked(true);
    startTimeout();
  };

  return (
    <TouchableOpacity
      onPress={
        sensitive && !isVisible ? handleVisibilityClick : handleCopyPress
      }
      style={styles.container}
    >
      {sensitive && (
        <TouchableOpacity onPress={handleVisibilityClick}>
          <Icon
            name={isVisible ? IconName.EyeSlash : IconName.Eye}
            color={styles.icon.color}
            testID="reveal-icon"
          />
        </TouchableOpacity>
      )}
      {sensitive && !isVisible && (
        <Text style={styles.revealText}>
          {strings('snap_ui.revealSensitiveContent.message')}
        </Text>
      )}
      {isVisible && <Text style={styles.text}>{text}</Text>}
      {isVisible && (
        <Icon
          name={isClicked ? IconName.CopySuccess : IconName.Copy}
          color={styles.icon.color}
          testID="copy-icon"
        />
      )}
    </TouchableOpacity>
  );
};
