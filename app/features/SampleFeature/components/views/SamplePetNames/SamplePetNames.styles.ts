import { StyleSheet } from 'react-native';
import {Theme} from '../../../../../util/theme/models';

// TODO - implement proper styles for the SampleCounterPane component following our guidelines
const styleSheet = (params: {
    theme: Theme;
}) => {
    const { theme } = params;
    const { colors } = theme;
    return StyleSheet.create({
        wrapper: {
            backgroundColor: colors.background.default,
            flex: 1,
            marginTop: 16,
        },
        keyboardAvoidingView: {
            flex: 1,
            flexDirection: 'row',
            alignSelf: 'center',
        },
        formContainer: {
            marginTop: 24,
            paddingBottom: 24,
        },
        inputContainer: {
            marginBottom: 16,
        },
        buttonContainer: {
            marginTop: 8,
        },
        PetNameListItem: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            padding: 8,
        },
        textStack: {
            marginLeft: 12,
            flex: 1,
        }, card: {
            width: '100%',
        }
    });
};

export default styleSheet;
