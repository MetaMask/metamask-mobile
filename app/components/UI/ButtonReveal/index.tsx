import React, { useState } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Text from '../../Base/Text';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { colors } from '../../../styles/common';
import { AnimatedSVGPath } from 'react-native-svg-animations';

const styles = StyleSheet.create({
	holdButton: {
		justifyContent: 'space-between',
		alignItems: 'center',
		flexDirection: 'row',
		alignSelf: 'center',
		backgroundColor: colors.blue,
		borderRadius: 100,
		paddingLeft: 8,
		paddingRight: 16,
		height: 40,
	},
	buttonText: {
		color: colors.white,
	},
	buttonIcon: {
		justifyContent: 'center',
		alignItems: 'center',
		height: 28,
		width: 28,
		borderWidth: 3,
		borderRadius: 20,
		borderColor: colors.black + '66',
		paddingLeft: 1,
		paddingBottom: 1,
		marginRight: 8,
		position: 'relative',
	},
	progress: {
		position: 'absolute',
	},
});

const ButtonReveal = ({ onLongPress, delayLongPress = 2000, testID, label, onPress = () => {} }) => {
	const [pressed, setPressed] = useState(false);
	const handleOnPressIn = () => {
		setPressed(true);
	};
	const handleOnPressOut = () => {
		setPressed(false);
	};
	return (
		<Pressable style={styles.holdButton} onPressIn={handleOnPressIn} onPressOut={handleOnPressOut} testID={testID}>
			<View style={styles.buttonIcon}>
				<Icon name={'lock'} size={10} color={colors.white} />
				<View style={styles.progress}>
					{pressed && (
						<AnimatedSVGPath
							d="M14 1.50001C20.9036 1.50001 26.5 7.09645 26.5 14C26.5 20.9036 20.9036 26.5 14 26.5C7.09644 26.5 1.5 20.9036 1.5 14C1.5 13.8502 1.50263 13.701 1.50784 13.5526C1.74288 6.85681 7.24618 1.50001 14 1.50001Z"
							strokeWidth={3}
							strokeColor={colors.white}
							duration={delayLongPress}
							delay={0}
							width={24}
							height={24}
							viewBox="0 0 24 24"
							fill="none"
						/>
					)}
				</View>
			</View>
			<Text style={styles.buttonText}>{label}</Text>
		</Pressable>
	);
};

export default ButtonReveal;
