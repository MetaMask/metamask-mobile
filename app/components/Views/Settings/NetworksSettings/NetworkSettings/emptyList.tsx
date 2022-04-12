import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Alert, { AlertType } from '../../../../Base/Alert';
import { useAppThemeFromContext, mockTheme } from '../../../../../util/theme';

const createStyles = (colors: any) =>
	StyleSheet.create({
		wrapper: {
			backgroundColor: colors.background.default,
			flex: 1,
		},
		container: { marginHorizontal: 10, marginTop: 20, paddingRight: 0 },
		emptyDescriptionText: { color: colors.text.default },
		link: { color: colors.primary.default },
	});

interface Props {
    goToCustomNetwork: () => void;
}

const EmptyPopularList = ({goToCustomNetwork}: Props) => {
    const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyles(colors);
    return (
        <Alert
            type={AlertType.Info}
            style={styles.container}
        >
            <>
                <Text style={styles.emptyDescriptionText}>{`${strings('networks.empty_popular_networks')} `}</Text>
                <Text
                    suppressHighlighting
                    onPress={goToCustomNetwork}
                    style={styles.link}
                >
                    {strings('networks.add_network')}
                </Text>
            </>
        </Alert>
    );
};

export default EmptyPopularList;