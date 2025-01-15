import { StyleSheet } from "react-native";
import { Theme } from "../../../util/theme/models";
import { fontStyles } from "../../../styles/common";

export const createStyles = (colors: Theme['colors']) =>
    StyleSheet.create({
      wrapper: {
        flex: 1,
        backgroundColor: colors.background.default,
      },
      contentContainer: {
        paddingVertical: 15,
      },
      bookmarkIco: {
        width: 26,
        height: 26,
        marginRight: 7,
        borderRadius: 13,
      },
      fallbackTextStyle: {
        fontSize: 12,
      },
      name: {
        fontSize: 14,
        color: colors.text.default,
        ...fontStyles.normal,
      },
      category: {
        fontSize: 16,
        color: colors.text.default,
        ...fontStyles.bold,
        margin: 10,
      },
      url: {
        fontSize: 12,
        color: colors.text.alternative,
        ...fontStyles.normal,
      },
      item: {
        flex: 1,
        marginBottom: 20,
      },
      itemWrapper: {
        flexDirection: 'row',
        marginBottom: 20,
        paddingHorizontal: 15,
      },
      textContent: {
        flex: 1,
        marginLeft: 10,
      },
      bg: {
        flex: 1,
      },
      deleteFavorite: {
        marginLeft: 10,
      },
    });