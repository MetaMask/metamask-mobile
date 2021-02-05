import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../../styles/common';

import Alert from '../../../Base/Alert';
import Text from '../../../Base/Text';

const VERTICAL_DISPLACEMENT = 12;
const styles = StyleSheet.create({
	content: {
		flex: 1,
		alignItems: 'center'
	},
	contentWithAction: {
		marginBottom: 10
	},
	wrapper: {
		flexDirection: 'column',
		flex: 1
	},
	action: {
		marginTop: -5,
		marginBottom: -VERTICAL_DISPLACEMENT,
		bottom: -VERTICAL_DISPLACEMENT,
		alignItems: 'center'
	},
	button: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 100
	},
	warningButton: {
		backgroundColor: colors.yellow
	},
	errorButton: {
		backgroundColor: colors.red
	},
	errorButtonText: {
		color: colors.white
	}
});

const getButtonStyle = type => {
	switch (type) {
		case 'error': {
			return styles.errorButton;
		}
		case 'warning':
		default: {
			return styles.warningButton;
		}
	}
};

function Button({ type, onPress, children }) {
	return (
		<TouchableOpacity onPress={onPress} style={[styles.button, getButtonStyle(type)]}>
			<Text small bold primary style={[type === 'error' && styles.errorButtonText]}>
				{children}
			</Text>
		</TouchableOpacity>
	);
}

Button.propTypes = {
	type: PropTypes.oneOf(['info', 'warning', 'error']),
	onPress: PropTypes.func,
	children: PropTypes.string
};

function ActionAlert({ type, style, action, onPress, children }) {
	return (
		<Alert small type={type} style={[style, Boolean(action) && styles.contentWithAction]}>
			{textStyle => (
				<View style={styles.wrapper}>
					<View style={[styles.content]}>{children(textStyle)}</View>
					{Boolean(action) && (
						<View style={[styles.action]}>
							<Button onPress={onPress} type={type}>
								{action}
							</Button>
						</View>
					)}
				</View>
			)}
		</Alert>
	);
}

ActionAlert.propTypes = {
	type: PropTypes.oneOf(['info', 'warning', 'error']),
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
	onPress: PropTypes.func,
	action: PropTypes.string,
	children: PropTypes.oneOfType([PropTypes.node, PropTypes.func])
};
export default ActionAlert;
