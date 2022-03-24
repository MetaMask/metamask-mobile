import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../../util/theme';
import CustomText from '../../../Base/Text';
// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;

const createStyles = (colors: any) =>
	StyleSheet.create({
		wrapper: {
			padding: 16,
			borderWidth: 1.5,
			borderColor: colors.border.default,
			borderRadius: 8,
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
	highlighted?: boolean;
	label?: string;
	style?: StyleProp<ViewStyle>;
	thin?: boolean;
	onPress?: () => any;
}

const Box: React.FC<Props> = ({ highlighted, label, style, thin, onPress, ...props }: Props) => {
	const { colors } = useTheme();
	const styles = createStyles(colors);
	return (
		<>
			{Boolean(label) && (
				<Text black style={styles.label}>
					{label}
				</Text>
			)}
			<TouchableOpacity disabled={!onPress} onPress={onPress}>
				<View
					style={[styles.wrapper, thin && styles.thin, highlighted && styles.highlighted, style]}
					{...props}
				/>
			</TouchableOpacity>
		</>
	);
};

export default Box;
