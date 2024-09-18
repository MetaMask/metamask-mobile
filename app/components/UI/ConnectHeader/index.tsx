import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';

interface ConnectHeaderProps {
  action: () => void;
  title: string;
}

const createStyles = (colors: Colors) =>
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
  //DEVIN_TODO: Determine the exact structure of `colors` from ThemeContext
  const colors = context?.colors || mockTheme.colors;
  //DEVIN_TODO: Determine the exact structure of `styles` returned by createStyles
  const styles = createStyles(colors);

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={action}>
        <IonicIcon
          name={'ios-arrow-back'}
          size={24}
          color={colors.text.default}
        />
      </TouchableOpacity>
      {/* DEVIN_TODO: Check the possible values for TextVariant */}
      <Text variant={TextVariant.HeadingSMRegular} style={styles.title}>
        {title}
      </Text>
    </View>
  );
};

export default ConnectHeader;
