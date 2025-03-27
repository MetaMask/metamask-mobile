import { StyleSheet } from "react-native";
import { fontStyles } from "../../../styles/common";

const createStyles = (colors: {
  text: { default: string; alternative: string };
}) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    iconContainer: {
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    title: {
      ...fontStyles.bold,
      fontSize: 14,
      color: colors.text.default,
      marginBottom: 4,
    },
    description: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.alternative,
    },
  });

export default createStyles;