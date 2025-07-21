import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    content: {
      marginTop: 16,
    },
    section: {
      marginBottom: 20,
    },
    description: {
      marginBottom: 16,
    },
    detailsContainer: {
      marginTop: 12,
    },
    detailItem: {
      marginBottom: 8,
    },
    detailBullet: {
      paddingLeft: 8,
    },
    bulletPoint: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text.default,
      marginBottom: 8,
    },
    footer: {
      marginTop: 16,
      padding: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
    },
  });
