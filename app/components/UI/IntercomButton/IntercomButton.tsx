import React from 'react';
import { Pressable } from 'react-native';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import {
  useIntercom,
  useIntercomInitialization,
} from '../../../util/intercom/IntercomEmailPrompt';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './IntercomButton.styles';

const IntercomButton = () => {
  const { styles } = useStyles(styleSheet, {});

  useIntercomInitialization();
  const { handlePress, handleLongPress, EmailPrompt } = useIntercom();

  return (
    <>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        testID="global-intercom-button"
        style={styles.intercomButton}
      >
        <Icon
          name={IconName.Tag}
          color={IconColor.Inverse}
          size={IconSize.Md}
        />
      </Pressable>
      <EmailPrompt />
    </>
  );
};

export default IntercomButton;
