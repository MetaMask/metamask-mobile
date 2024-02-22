import React from 'react';
import { StyleSheet, View } from 'react-native';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
import { useTheme } from '../../../../util/theme';
import {
  NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON,
  NEW_NETWORK_ADDED_CLOSE_BUTTON,
} from '../../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
const createStyles = (colors: any) =>
  StyleSheet.create({
    buttonView: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    button: {
      flex: 1,
    },
    cancel: {
      marginRight: 8,
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,

      borderWidth: 1,
    },
    confirm: {
      marginLeft: 8,
    },
  });

interface NetworkAddedProps {
  nickname: string;
  closeModal: () => void;
  switchNetwork: () => void;
}

const NetworkAdded = (props: NetworkAddedProps) => {
  const { nickname, closeModal, switchNetwork } = props;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View>
      <Text centered bold black big>
        {strings('networks.new_network')}
      </Text>
      <Text centered>
        <Text bold>{`"${strings('networks.network_name', {
          networkName: nickname,
        })}"`}</Text>
        <Text>{strings('networks.network_added')}</Text>
      </Text>
      <View style={styles.buttonView}>
        <StyledButton
          type={'cancel'}
          testID={NEW_NETWORK_ADDED_CLOSE_BUTTON}
          onPress={closeModal}
          containerStyle={[styles.button, styles.cancel]}
        >
          {strings('networks.close')}
        </StyledButton>
        <StyledButton
          type={'confirm'}
          onPress={switchNetwork}
          testID={NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON}
          containerStyle={[styles.button, styles.confirm]}
        >
          {strings('networks.switch_network')}
        </StyledButton>
      </View>
    </View>
  );
};

export default NetworkAdded;
