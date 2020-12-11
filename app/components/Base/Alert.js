import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../styles/common';
import Text from './Text';

const styles = StyleSheet.create({
	base: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderWidth: 1,
		borderRadius: 4,
		flexDirection: 'row'
	},
	baseSmall: {
		paddingVertical: 8
	},
	info: {
		backgroundColor: colors.blue100,
		borderColor: colors.blue
	},
	warning: {
		backgroundColor: colors.yellow100,
		borderColor: colors.yellow
	},
	error: {
		backgroundColor: colors.red000,
		borderColor: colors.red
	},
	textInfo: { color: colors.blue },
	textWarning: { color: colors.yellow700 },
	textError: { color: colors.red },
	textIconStyle: { marginRight: 12 },
	iconWrapper: {
		alignItems: 'center'
	}
});

function getStyles(type) {
	switch (type) {
		case 'warning': {
			return [styles.warning, styles.textWarning];
		}
		case 'error': {
			return [styles.error, styles.textError];
		}
		case 'info':
		default: {
			return [styles.info, styles.textInfo];
		}
	}
}

function Alert({ type = 'info', small, renderIcon, style, onPress, children }) {
	const [wrapperStyle, textStyle] = useMemo(() => getStyles(type), [type]);

	const Wrapper = onPress ? TouchableOpacity : View;
	return (
		<Wrapper style={[styles.base, small && styles.baseSmall, wrapperStyle, style]} onPress={onPress}>
			{renderIcon && typeof renderIcon === 'function' && <View style={styles.iconWrapper}>{renderIcon()}</View>}
			{typeof children === 'function' ? (
				children(textStyle)
			) : (
				<Text small={small} style={[textStyle, !!renderIcon && styles.textIconStyle]}>
					{children}
				</Text>
			)}
		</Wrapper>
	);
}

Alert.propTypes = {
	type: PropTypes.oneOf(['info', 'warning', 'error']),
	style: PropTypes.object,
	small: PropTypes.boolean,
	renderIcon: PropTypes.func,
	onPress: PropTypes.func,
	children: PropTypes.node
};

export default Alert;
