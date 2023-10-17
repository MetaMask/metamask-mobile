import React, { useCallback } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import Text from '../../../Base/Text';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Box from './Box';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    box: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderWidth: 0,
    },
    cancel: {
      alignSelf: 'flex-end',
    },
    link: {
      paddingBottom: 20,
    },
    modal: {
      padding: 8,
    },
    row: {
      paddingVertical: 10,
    },
  });

interface Props {
  isVisible?: boolean;
  title?: string;
  subtitle?: string;
  body?: string;
  footer?: string;
  dismissButtonText?: string;
  link?: string;
  dismiss?: () => any;
}

const SUPPORT_URL =
  'https://metamask.zendesk.com/hc/en-us/articles/4863623238683-My-country-region-isn-t-supported-for-MetaMask-on-ramps';

const RegionAlert: React.FC<Props> = ({
  isVisible,
  title,
  subtitle,
  body,
  dismiss,
  link,
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleSupportLinkPress = useCallback(
    () => Linking.openURL(SUPPORT_URL),
    [],
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      style={styles.modal}
    >
      <Box style={styles.box}>
        <TouchableOpacity onPress={dismiss} style={styles.cancel}>
          <EvilIcons name="close" size={17} color={colors.icon.default} />
        </TouchableOpacity>
        <View style={styles.row}>
          <Text bold primary bigger>
            {title}
          </Text>
          <Text black>{subtitle}</Text>
          <View style={styles.row}>
            <Text small>{body}</Text>
          </View>
          <TouchableOpacity onPress={handleSupportLinkPress}>
            <Text blue underline small style={styles.link}>
              {link}
            </Text>
          </TouchableOpacity>
        </View>
      </Box>
    </Modal>
  );
};

export default RegionAlert;
