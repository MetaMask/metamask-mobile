import React from 'react';
import { View,
  StyleSheet,
  ActivityIndicator } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import Text from '../../Base/Text';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import AntIcon from 'react-native-vector-icons/AntDesign';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { Theme } from '@metamask/design-tokens';

const createStyles = (colors: Theme['colors']) =>
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

interface LoaderProps {
  error?: boolean;
  onClose?: () => void;
  onError?: () => void;
}

function Loader({
  error = false,
  onClose = () => null,
  onError = () => null,
}: LoaderProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  React.useEffect(() => {
    if (error) {
      onError();
    }
  }, [error, onError]);

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

export default Loader;
