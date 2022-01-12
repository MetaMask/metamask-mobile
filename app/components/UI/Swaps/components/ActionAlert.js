import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../../styles/common';
import Alert, { AlertType } from '../../../Base/Alert';
import Text from '../../../Base/Text';
const AlertTypeKeys = Object.keys(AlertType);

const VERTICAL_DISPLACEMENT = 12;
const styles = StyleSheet.create({
	content: {
		flex: 1,
		alignItems: 'center',
	},
	contentWithAction: {
		marginBottom: 10,
	},
	wrapper: {
		flexDirection: 'column',
		flex: 1,
	},
	action: {
		marginTop: -5,
		marginBottom: -VERTICAL_DISPLACEMENT,
		bottom: -VERTICAL_DISPLACEMENT,
		alignItems: 'center',
	},
	button: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 100,
	},
	warningButton: {
		backgroundColor: colors.yellow,
	},
	errorButton: {
		backgroundColor: colors.red,
	},
	errorButtonText: {
		color: colors.white,
	},
	infoWrapper: {
		position: 'absolute',
		top: 3,
		right: 3,
	},
	warningInfoIcon: {
		color: colors.grey500,
	},
	errorInfoIcon: {
		color: colors.red,
	},
});

const getButtonStyle = (type) => {
	switch (type) {
		case AlertType.Error: {
			return styles.errorButton;
		}
		case AlertType.Warning:
		default: {
			return styles.warningButton;
		}
	}
};

const getInfoIconStyle = (type) => {
	switch (type) {
		case AlertType.Error: {
			return styles.errorInfoIcon;
		}
		case AlertType.Warning:
		default: {
			return styles.warningInfoIcon;
		}
	}
};

function Button({ type, onPress, children }) {
	return (
		<TouchableOpacity onPress={onPress} style={[styles.button, getButtonStyle(type)]}>
			<Text small bold primary style={[type === AlertType.Error && styles.errorButtonText]}>
				{children}
			</Text>
		</TouchableOpacity>
	);
}

Button.propTypes = {
	type: PropTypes.oneOf(AlertTypeKeys),
	onPress: PropTypes.func,
	children: PropTypes.string,
};

function ActionAlert({ type, style, action, onInfoPress, onPress, children }) {
	return (
		<Alert small type={type} style={[style, Boolean(action) && styles.contentWithAction]}>
			{(textStyle) => (
				<>
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
					{Boolean(onInfoPress) && (
						<TouchableOpacity
							style={styles.infoWrapper}
							hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
							onPress={onInfoPress}
						>
							<MaterialIcon name="info" size={16} style={getInfoIconStyle(type)} />
						</TouchableOpacity>
					)}
				</>
			)}
		</Alert>
	);
}

ActionAlert.propTypes = {
	type: PropTypes.oneOf(AlertTypeKeys),
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
	onPress: PropTypes.func,
	onInfoPress: PropTypes.func,
	action: PropTypes.string,
	children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};
export default ActionAlert;
