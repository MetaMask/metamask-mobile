import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import Device from '../../../../app/util/device';
import { useTheme } from '../../../util/theme';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import StyledButton from '../StyledButton';
import { useDispatch } from 'react-redux';
import { toggleSDKFeedbackModal } from '../../../../app/actions/modals';
import { strings } from '../../../../locales/i18n';

// eslint-disable-next-line
interface SDKFeedbackModalrops {}

const createStyles = (colors: ThemeColors, _safeAreaInsets: EdgeInsets) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 7,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 50,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    icon: {
      alignSelf: 'center',
      color: colors.error.default,
      lineHeight: 56,
    },
    title: {
      lineHeight: 24,
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    info: {
      padding: 20,
    },
    action: {
      marginLeft: 20,
      marginRight: 20,
      marginBottom: 20,
    },
  });

export const SDKFeedbackModal = (_props?: SDKFeedbackModalrops) => {
  const safeAreaInsets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);

  return (
    <View style={styles.root}>
      <FontAwesome
        style={styles.icon}
        name={'warning'}
        size={32}
        color={colors.text.default}
      />
      <Text style={styles.title}>{strings('sdk_feedback_modal.title')}</Text>
      <Text style={styles.info}>{strings('sdk_feedback_modal.info')}</Text>
      <View style={styles.action}>
        <StyledButton
          type={'confirm'}
          onPress={() => {
            dispatch(toggleSDKFeedbackModal(false));
          }}
        >
          {strings('sdk_feedback_modal.ok')}
        </StyledButton>
      </View>
    </View>
  );
};

export default SDKFeedbackModal;
