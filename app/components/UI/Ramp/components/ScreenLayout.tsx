import React from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import Text from '../../../Base/Text';

interface Style {
  wrapper: ViewStyle;
  container: ViewStyle;
  content: ViewStyle;
  header: ViewStyle;
  body: ViewStyle;
  grow: ViewStyle;
  description: ViewStyle;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create<Style>({
    wrapper: {
      flex: 1,
    },
    container: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      padding: 15,
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

interface IPropsScreenLayout {
  scrollable?: boolean;
  style?: ViewStyle;
}

interface IStaticComponents {
  Header: React.FC<IPropsHeader>;
  Body: React.FC<IPropsHeader>;
  Footer: React.FC<IPropsHeader>;
  Content: React.FC<IPropsHeader>;
}

interface IPropsHeader {
  title?: string | (() => void);
  description?: string;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  bold?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface IPropsBody {
  style?: ViewStyle;
}

interface IPropsFooter {
  style?: ViewStyle;
}

interface IPropsContent {
  grow?: boolean;
  style?: ViewStyle;
}

const ScreenLayout: React.FC<IPropsScreenLayout> & IStaticComponents = ({
  style,
  scrollable,
  ...props
}: IPropsScreenLayout) => {
  const Component = scrollable ? ScrollView : View;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.wrapper}>
      <Component style={[styles.container, style]} {...props} />
    </SafeAreaView>
  );
};

const Header: React.FC<IPropsHeader> = ({
  title,
  description,
  bold,
  children,
  style,
  titleStyle,
  descriptionStyle,
  ...props
}: IPropsHeader) => {
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

const Body: React.FC<IPropsBody> = ({ style, ...props }: IPropsBody) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.body, style]} {...props} />;
};

const Footer: React.FC<IPropsFooter> = ({ style, ...props }: IPropsFooter) => (
  <View style={style} {...props} />
);
const Content: React.FC<IPropsContent> = ({
  style,
  grow,
  ...props
}: IPropsContent) => {
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
