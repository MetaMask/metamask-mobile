import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Text from '../../Base/Text';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import AntIcon from 'react-native-vector-icons/AntDesign';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    item: {
      marginVertical: 5,
    },
    text: {
      fontSize: 16,
      color: colors.text.default,
    },
    closeButton: {
      alignSelf: 'flex-end',
      padding: 14,
      width: 44,
      height: 44,
    },
  });

function Loader({ error, onClose }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <AntIcon color={colors.text.default} size={16} name={'close'} />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={styles.item}>
          {error ? (
            <FA5Icon name="video-slash" color={colors.icon.default} size={40} />
          ) : (
            <ActivityIndicator color={colors.icon.default} size="large" />
          )}
        </View>
        <View style={styles.item}>
          <Text style={styles.text} black>
            {strings(`media_player.${error ? 'not_found' : 'loading'}`)}
          </Text>
        </View>
      </View>
    </View>
  );
}

Loader.propTypes = {
  error: PropTypes.bool,
  onClose: PropTypes.func,
};

Loader.defaultProps = {
  onError: () => null,
};

export default Loader;
