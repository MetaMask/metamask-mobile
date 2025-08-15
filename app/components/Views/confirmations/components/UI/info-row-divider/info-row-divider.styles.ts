import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

export enum InfoRowDividerVariant {
  Default = 'default',
  Large = 'large',
}

const styleSheet = (params: {
  theme: Theme;
  vars: { variant?: InfoRowDividerVariant };
}) => {
  const { theme } = params;
  const { vars } = params;
  const { variant } = vars;

  return StyleSheet.create({
    infoRowDivider: {
      height: variant === InfoRowDividerVariant.Large ? 2 : 1,
      backgroundColor:
        variant === InfoRowDividerVariant.Large
          ? theme.colors.background.alternative
          : theme.colors.border.muted,
      marginVertical: 8,
      marginLeft: -8,
      marginRight: -8,
    },
  });
};

export default styleSheet;
