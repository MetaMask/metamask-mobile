import React from 'react';
import {
  StyleSheet,
  View,
  ViewProps,
  TextProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Text from './Text';
import { useTheme } from '../../util/theme';
import { Theme } from '@metamask/design-tokens';
import { fontStyles } from '../../styles/common';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    wrapper: {
      padding: 15,
      // TODO(wachunei): check if this can be removed without breaking anything
      // minHeight: Device.isIos() ? 55 : 100
    },
    date: {
      color: colors.text.default,
      fontSize: 12,
      marginBottom: 10,
      ...fontStyles.normal,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actions: {
      flexDirection: 'row',
      paddingTop: 10,
      paddingLeft: 40,
    },
    icon: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 15,
    },
    body: {
      flex: 1,
    },
    amounts: {
      flex: 0.6,
      alignItems: 'flex-end',
    },
    title: {
      fontSize: 15,
      color: colors.text.default,
    },
    amount: {
      fontSize: 15,
      color: colors.text.default,
    },
    fiatAmount: {
      fontSize: 12,
      color: colors.text.alternative,
      textTransform: 'uppercase',
    },
  });

interface ListItemProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

interface ListItemTextProps extends TextProps {
  style?: StyleProp<TextStyle>;
}

type ListItemComponent = React.FC<ListItemProps> & {
  Date: React.FC<ListItemTextProps>;
  Content: React.FC<ListItemProps>;
  Actions: React.FC<ListItemProps>;
  Icon: React.FC<ListItemProps>;
  Body: React.FC<ListItemProps>;
  Title: React.FC<ListItemTextProps>;
  Amounts: React.FC<ListItemProps>;
  Amount: React.FC<ListItemTextProps>;
  FiatAmount: React.FC<ListItemTextProps>;
};

const ListItem: ListItemComponent = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.wrapper, style]} {...props} />;
};

const ListItemDate: React.FC<ListItemTextProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <Text style={[styles.date, style]} {...props} />;
};

const ListItemContent: React.FC<ListItemProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.content, style]} {...props} />;
};

const ListItemActions: React.FC<ListItemProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.actions, style]} {...props} />;
};

const ListItemIcon: React.FC<ListItemProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.icon, style]} {...props} />;
};

const ListItemBody: React.FC<ListItemProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.body, style]} {...props} />;
};

const ListItemTitle: React.FC<ListItemTextProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <Text style={[styles.title, style]} {...props} />;
};

const ListItemAmounts: React.FC<ListItemProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={[styles.amounts, style]} {...props} />;
};

const ListItemAmount: React.FC<ListItemTextProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <Text style={[styles.amount, style]} {...props} />;
};

const ListItemFiatAmount: React.FC<ListItemTextProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <Text style={[styles.fiatAmount, style]} {...props} />;
};

ListItem.Date = ListItemDate;
ListItem.Content = ListItemContent;
ListItem.Actions = ListItemActions;
ListItem.Icon = ListItemIcon;
ListItem.Body = ListItemBody;
ListItem.Title = ListItemTitle;
ListItem.Amounts = ListItemAmounts;
ListItem.Amount = ListItemAmount;
ListItem.FiatAmount = ListItemFiatAmount;

export default ListItem;
