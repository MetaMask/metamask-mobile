import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../../styles/common';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	viewWrapper: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginHorizontal: 24
	},
	viewContainer: {
		width: '100%',
		backgroundColor: colors.white,
		borderRadius: 10
	},
	actionContainer: {
		borderTopColor: colors.grey200,
		borderTopWidth: 1
	},
	actionHorizontalContainer: {
		flexDirection: 'row',
		padding: 16
	},
	actionVerticalContainer: {
		flexDirection: 'column',
		paddingHorizontal: 16,
		paddingVertical: 8
	},
	childrenContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	button: {
		margin: 8
	},
	buttonHorizontal: {
		flex: 1
	}
});

/**
 * View that renders the content of an action modal
 * The objective of this component is to reuse it in other places and not
 * only on ActionModal component
 */
export default function ActionContent({
	cancelTestID,
	confirmTestID,
	cancelText,
	children,
	confirmText,
	confirmDisabled,
	cancelButtonMode,
	confirmButtonMode,
	displayCancelButton,
	displayConfirmButton,
	onCancelPress,
	onConfirmPress,
	viewWrapperStyle,
	viewContainerStyle,
	actionContainerStyle,
	childrenContainerStyle,
	verticalButtons
}) {
	return (
		<View style={[styles.viewWrapper, viewWrapperStyle]}>
			<View style={[styles.viewContainer, viewContainerStyle]}>
				<View style={[styles.childrenContainer, childrenContainerStyle]}>{children}</View>
				<View
					style={[
						styles.actionContainer,
						verticalButtons ? styles.actionVerticalContainer : styles.actionHorizontalContainer,
						actionContainerStyle
					]}
				>
					{displayCancelButton && (
						<StyledButton
							testID={cancelTestID}
							type={cancelButtonMode}
							onPress={onCancelPress}
							containerStyle={[styles.button, verticalButtons ? {} : styles.buttonHorizontal]}
						>
							{cancelText}
						</StyledButton>
					)}
					{displayConfirmButton && (
						<StyledButton
							testID={confirmTestID}
							type={confirmButtonMode}
							onPress={onConfirmPress}
							containerStyle={[styles.button, verticalButtons ? {} : styles.buttonHorizontal]}
							disabled={confirmDisabled}
						>
							{confirmText}
						</StyledButton>
					)}
				</View>
			</View>
		</View>
	);
}

ActionContent.defaultProps = {
	cancelButtonMode: 'neutral',
	confirmButtonMode: 'warning',
	confirmTestID: '',
	cancelTestID: '',
	cancelText: strings('action_view.cancel'),
	confirmText: strings('action_view.confirm'),
	confirmDisabled: false,
	displayCancelButton: true,
	displayConfirmButton: true,
	viewWrapperStyle: null,
	viewContainerStyle: null,
	childrenContainerStyle: null
};

ActionContent.propTypes = {
	/**
	 * TestID for the cancel button
	 */
	cancelTestID: PropTypes.string,
	/**
	 * TestID for the confirm button
	 */
	confirmTestID: PropTypes.string,
	/**
	 * Text to show in the cancel button
	 */
	cancelText: PropTypes.string,
	/**
	 * Content to display above the action buttons
	 */
	children: PropTypes.node,
	/**
	 * Type of button to show as the cancel button
	 */
	cancelButtonMode: PropTypes.oneOf(['cancel', 'neutral', 'confirm', 'normal', 'warning']),
	/**
	 * Type of button to show as the confirm button
	 */
	confirmButtonMode: PropTypes.oneOf(['normal', 'neutral', 'confirm', 'warning']),
	/**
	 * Whether confirm button is disabled
	 */
	confirmDisabled: PropTypes.bool,
	/**
	 * Text to show in the confirm button
	 */
	confirmText: PropTypes.string,
	/**
	 * Whether cancel button should be displayed
	 */
	displayCancelButton: PropTypes.bool,
	/**
	 * Whether confirm button should be displayed
	 */
	displayConfirmButton: PropTypes.bool,
	/**
	 * Called when the cancel button is clicked
	 */
	onCancelPress: PropTypes.func,
	/**
	 * Called when the confirm button is clicked
	 */
	onConfirmPress: PropTypes.func,
	/**
	 * View wrapper style
	 */
	viewWrapperStyle: PropTypes.object,
	/**
	 * View container style
	 */
	viewContainerStyle: PropTypes.object,
	/**
	 * Action container style
	 */
	actionContainerStyle: PropTypes.object,
	/**
	 * Whether buttons are rendered vertically
	 */
	verticalButtons: PropTypes.bool,
	/**
	 * Children container style
	 */
	childrenContainerStyle: PropTypes.object
};
