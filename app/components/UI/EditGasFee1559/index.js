import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../../Base/Text';
import StyledButton from '../StyledButton';

const styles = StyleSheet.create({
	root: {
		paddingHorizontal: 24
	},
	headerContainer: {
		alignItems: 'center'
	},
	headerText: {
		fontSize: 48
	},
	headerTitle: {
		flexDirection: 'row'
	},
	headerTitleSide: {
		flex: 1
	},
	saveButton: {
		marginBottom: 20
	}
});

const EditGasFee1559 = () => (
	<View style={styles.root}>
		<View style={styles.headerContainer}>
			<View style={styles.headerTitle}>
				<View style={styles.headerTitleSide}>
					<Text right black style={styles.headerText}>
						~
					</Text>
				</View>
				<Text black style={styles.headerText}>
					$6.32
				</Text>
				<View style={styles.headerTitleSide} />
			</View>
			<Text big black>
				Up to <Text bold>$6.32</Text>
			</Text>
			<Text red>Unknown processing time</Text>
		</View>
		<View>
			<Text>SELECTOR</Text>
		</View>
		<View>
			<Text>ADVANCED AND RANGE INPUTS</Text>
		</View>
		<View>
			<TouchableOpacity style={styles.saveButton}>
				<Text link centered>
					How should I choose?
				</Text>
			</TouchableOpacity>
			<StyledButton type={'confirm'}>Save</StyledButton>
		</View>
	</View>
);

export default EditGasFee1559;
