import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors: any) =>
	StyleSheet.create({
		wrapper: {
			padding: 18,
			borderRadius: 6,
			backgroundColor: colors.background.alternative,
		},
		label: {
			marginVertical: 8,
		},
		highlighted: {
			borderColor: colors.primary.default,
		},
		thin: {
			paddingVertical: 12,
		},
	});

interface Props {
	style?: StyleProp<ViewStyle>;
	thin?: boolean;
}

const Box: React.FC<Props> = ({ style, thin, ...props }: Props) => {
	const { colors } = useTheme();
	const styles = createStyles(colors);
	return (
		<>
			<View style={[styles.wrapper, thin && styles.thin, style]} {...props} />
		</>
	);
};

export default Box;
