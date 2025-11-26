import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ViewStyle,
  TextStyle,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import Text from '../../../../Base/Text';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    container: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      padding: 15,
      paddingHorizontal: 16,
    },
    grow: {
      flex: 1,
    },
    header: {
      marginVertical: 16,
      alignItems: 'center',
    },
    body: {
      flex: 1,
    },
    description: {
      marginHorizontal: 20,
    },
  });

interface ScreenLayoutProps extends ViewProps {
  scrollable?: boolean;
  style?: ViewStyle;
}

interface HeaderProps extends ViewProps {
  title?: string | (() => React.ReactNode);
  description?: string;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  bold?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface BodyProps extends ViewProps {
  style?: ViewStyle;
}

interface FooterProps extends ViewProps {
  style?: ViewStyle;
}

interface ContentProps extends ViewProps {
  grow?: boolean;
  style?: ViewStyle;
}

const ScreenLayout = ({ style, scrollable, ...props }: ScreenLayoutProps) => {
  const Component = scrollable ? ScrollView : View;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <SafeAreaView edges={['right', 'bottom', 'left']} style={styles.wrapper}>
      <Component style={[styles.container, style]} {...props} />
    </SafeAreaView>
  );
};

const Header = ({
  title,
  description,
  bold,
  children,
  style,
  titleStyle,
  descriptionStyle,
  ...props
}: HeaderProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.header, style]} {...props}>
      {title && (
        <Text style={titleStyle} big black centered bold={bold}>
          {typeof title === 'function' ? title() : title}
        </Text>
      )}
      {description && (
        <Text style={[styles.description, descriptionStyle]} centered grey>
          {description}
        </Text>
      )}
      {children}
    </View>
  );
};

const Body = ({ style, ...props }: BodyProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.body, style]} {...props} />;
};

const Footer = ({ style, ...props }: FooterProps) => (
  <View style={style} {...props} />
);
const Content = ({ style, grow, ...props }: ContentProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.content, grow && styles.grow, style]} {...props} />
  );
};

ScreenLayout.Header = Header;
ScreenLayout.Body = Body;
ScreenLayout.Footer = Footer;
ScreenLayout.Content = Content;

export default ScreenLayout;
