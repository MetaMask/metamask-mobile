import React from 'react';
import { View, StyleSheet } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { Theme } from '@metamask/design-tokens';

interface ConnectHeaderProps {
  action: () => void;
  title: string;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    header: {
      width: '100%',
      position: 'relative',
      paddingBottom: 20,
    },
    title: {
      color: colors.text.default,
      fontSize: 16,
      textAlign: 'center',
      paddingVertical: 12,
    },
    back: {
      position: 'absolute',
      zIndex: 1,
      paddingVertical: 10,
      paddingRight: 10,
    },
  });

const ConnectHeader: React.FC<ConnectHeaderProps> = ({ title, action }) => {
  const context = React.useContext(ThemeContext);
  const colors = context?.colors || mockTheme.colors;
  const styles = createStyles(colors);

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={action}>
        <IonicIcon name={'arrow-back'} size={24} color={colors.text.default} />
      </TouchableOpacity>
      <Text variant={TextVariant.BodyMD} style={styles.title}>
        {title}
      </Text>
    </View>
  );
};

export default ConnectHeader;
