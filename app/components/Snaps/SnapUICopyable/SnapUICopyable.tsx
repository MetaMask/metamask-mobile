import React, { useState } from 'react';
import { Text, View } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const { styles } = useStyles(styleSheet, {
    sensitive,
    isVisible,
  });

  const CHARACTER_LIMIT = 100;
  const isTextTooLong = text.length > CHARACTER_LIMIT;
  const displayText =
    isExpanded || !isTextTooLong
      ? text
      : `${text.substring(0, CHARACTER_LIMIT)}...`;

  const startTimeout = () =>
    // 3 seconds
    setTimeout(() => setIsClicked(false), 3 * 1000, false);

  const handleVisibilityClick = () => {
    setIsVisible((state) => !state);
  };

  const handleCopyPress = async () => {
    await ClipboardManager.setString(text);
    setIsClicked(true);
    startTimeout();
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.containerWrapper}>
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
        <View style={styles.content}>
          {isVisible && (
            <Text style={styles.text} testID="copyable-text">
              {displayText}
            </Text>
          )}
        </View>
        {isVisible && (
          <Icon
            name={isClicked ? IconName.CopySuccess : IconName.Copy}
            color={styles.icon.color}
            testID="copy-icon"
          />
        )}
        {isVisible && isTextTooLong && (
          <TouchableOpacity
            onPress={toggleExpand}
            style={styles.moreButton}
            testID="more-button"
            activeOpacity={0.7}
          >
            <Text style={styles.moreButtonText}>
              {isExpanded
                ? strings('snap_ui.show_less')
                : strings('snap_ui.show_more')}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
};
