import { StyleSheet, TextStyle } from "react-native";
import { Theme } from "../../../util/theme/models";

export const createStyles = ({colors, typography}: Theme) =>
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
        color: colors.text.default,
        ...typography.lBodyMDMedium,
      } as TextStyle,
      category: {
        color: colors.text.default,
        margin: 10,
        ...typography.lHeadingSM,
      } as TextStyle,
      url: {
        color: colors.text.alternative,
        ...typography.lBodySM,
      } as TextStyle,
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