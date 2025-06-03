import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import { baseStyles } from '../../../styles/common';
import { getFontFamily, TextVariant } from '../../../component-library/components/Texts/Text';
export const styleSheet = ({ theme: { colors, typography } }: { theme: Theme }) => StyleSheet.create({
        container: {
            ...baseStyles.flexGrow,
            backgroundColor: colors.background.default,
        },
        header: {
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background.default,
        },
        headerText: {
            color: colors.text.default,
            backgroundColor: colors.background.default,
            marginRight: 10,
            ...typography.lHeadingSM,
            fontFamily: getFontFamily(TextVariant.HeadingSM),
        } as TextStyle,
    });

export default styleSheet;
