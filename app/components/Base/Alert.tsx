import React, { useCallback, ReactNode } from 'react';
import {
	View,
	StyleSheet,
	TouchableOpacity,
	ViewStyle,
	StyleProp,
	TouchableOpacityProps,
	ViewProps,
	TextStyle,
} from 'react-native';
import { colors } from '../../styles/common';
import CustomText from './Text';
// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;

export enum AlertType {
	Info = 'Info',
	Warning = 'Warning',
	ErrorType = 'Error',
}

interface Props {
	type: AlertType;
	style?: StyleProp<ViewStyle>;
	small?: boolean;
	renderIcon?: () => ReactNode;
	onPress?: () => void;
	children?: ReactNode;
}

const styles = StyleSheet.create({
	base: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderRadius: 8,
		flexDirection: 'row',
	},
	baseSmall: {
		paddingVertical: 8,
	},
	info: {
		backgroundColor: colors.info,
		borderColor: colors.onInfo,
	},
	warning: {
		backgroundColor: colors.yellow100,
		borderColor: colors.yellowWarningBorder,
	},
	error: {
		backgroundColor: colors.error,
		borderColor: colors.onError,
	},
	baseTextStyle: { fontSize: 14, flex: 1, lineHeight: 17 },
	textInfo: { color: colors.onInfo },
	textWarning: { color: colors.textDefault },
	textError: { color: colors.onError },
	textIconStyle: { marginRight: 12 },
	iconWrapper: {
		alignItems: 'center',
	},
});

const Alert = ({ type = AlertType.Info, small, renderIcon, style, onPress, children, ...props }: Props) => {
	const Wrapper: React.ComponentClass<TouchableOpacityProps | ViewProps> = onPress ? TouchableOpacity : View;

	const getStyles: (type: AlertType) => [StyleProp<ViewStyle>, StyleProp<TextStyle>] = useCallback((alertType) => {
		switch (alertType) {
			case AlertType.Warning: {
				return [styles.warning, { ...styles.textWarning, ...styles.baseTextStyle }];
			}
			case AlertType.ErrorType: {
				return [styles.error, { ...styles.textError, ...styles.baseTextStyle }];
			}
			case AlertType.Info:
			default: {
				return [styles.info, { ...styles.textInfo, ...styles.baseTextStyle }];
			}
		}
	}, []);

	const [wrapperStyle, textStyle] = getStyles(type);

	return (
		<Wrapper style={[styles.base, small && styles.baseSmall, wrapperStyle, style]} onPress={onPress} {...props}>
			{renderIcon && <View style={styles.iconWrapper}>{renderIcon()}</View>}
			{typeof children === 'function' ? (
				children(textStyle)
			) : (
				<Text small={small} style={[textStyle, !!renderIcon && styles.textIconStyle]}>
					{children}
				</Text>
			)}
		</Wrapper>
	);
};

export default Alert;
