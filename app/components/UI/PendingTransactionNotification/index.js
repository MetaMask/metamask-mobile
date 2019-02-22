import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, baseStyles } from '../../../styles/common';
import { FlashMessageWrapper, styleWithInset } from 'react-native-flash-message';
/**
 * MessageComponent `minHeight` property used mainly in vertical transitions
 */
const OFFSET_HEIGHT = 48;
const styles = StyleSheet.create({
	defaultFlash: {
		justifyContent: "flex-start",
		paddingVertical: 15,
		paddingHorizontal: 20,
		backgroundColor: "#696969",
		minHeight: OFFSET_HEIGHT,
	},
	defaultFlashFloating: {
		marginTop: 10,
		marginLeft: 12,
		marginRight: 12,
		borderRadius: 8,
	},
	flashLabel: {
		flexDirection: "column",
	},
	flashText: {
		fontSize: 14,
		lineHeight: 18,
		color: "#fff",
	},
	flashTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 5,
	},
});



/**
 */
// eslint-disable-next-line import/prefer-default-export
export const PendingTransactionNotification = ({
	message,
	style,
	textStyle,
	titleStyle,
	renderFlashMessageIcon,
	position = "top",
	floating = false,
	icon,
	hideStatusBar = false,
	...props
  }) => {

		return (
				<FlashMessageWrapper position={typeof position === "string" ? position : null}>
					{ wrapperInset => (
						<View
							style={
								[
								styles.defaultFlash,
								styles.defaultFlashFloating,
								style,
								]
							}
						>
							<View style={styles.flashLabel}>
								<Text>Lol</Text>
							</View>
						</View>
					)}
				</FlashMessageWrapper>
		);
}

