import React, { PureComponent } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import AntIcon from 'react-native-vector-icons/AntDesign';
import IonicIcon from 'react-native-vector-icons/Ionicons';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white
	},
	wrapper: {
		flexDirection: 'row',
		borderColor: colors.grey100,
		borderWidth: 1,
		margin: 8,
		borderRadius: 8,
		padding: 10,
		height: 52
	},
	input: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 6
	},
	address: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'flex-start',
		marginHorizontal: 6
	},
	textAddress: {
		...fontStyles.normal,
		fontSize: 14
	},
	textBalance: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500
	},
	label: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	textInput: {
		backgroundColor: colors.white,
		paddingLeft: 0,
		width: '100%'
	},
	scanIcon: {
		flexDirection: 'column',
		alignItems: 'center',
		color: colors.blue
	},
	scanIconWrapper: {
		marginTop: 1,
		flexDirection: 'row',
		alignItems: 'center'
	}
});

const AddressTo = () => (
	<View style={styles.wrapper}>
		<View style={styles.label}>
			<Text>To:</Text>
		</View>

		<View style={styles.input}>
			<TextInput
				autoCapitalize="none"
				autoCorrect={false}
				onChangeText={this.onChange}
				placeholder={'Search, public address (0x), or ENS'}
				placeholderTextColor={colors.grey100}
				spellCheck={false}
				style={styles.textInput}
				numberOfLines={1}
				onBlur={this.onBlur}
				onFocus={this.onInputFocus}
				onSubmitEditing={this.onFocus}
			/>
		</View>

		<TouchableOpacity onPress={this.scan} style={styles.scanIconWrapper}>
			<AntIcon name="scan1" size={20} style={styles.scanIcon} />
		</TouchableOpacity>
	</View>
);

const AddressFrom = () => (
	<View style={styles.wrapper}>
		<View style={styles.label}>
			<Text>From:</Text>
		</View>

		<View style={styles.address}>
			<Text style={styles.textAddress}>0x123...321</Text>
			<Text style={styles.textBalance}>Balance: 1234</Text>
		</View>

		<TouchableOpacity onPress={this.scan} style={styles.scanIcon}>
			<IonicIcon name={'ios-arrow-down'} size={20} style={styles.backIcon} />
		</TouchableOpacity>
	</View>
);

/**
 * View that wraps the wraps the "Send" screen
 */
export default class AddressInput extends PureComponent {
	static propTypes = {
		/**
		 * Render addres in 'to'
		 */
		addressTo: PropTypes.bool
	};

	render = () => {
		const { addressTo } = this.props;
		return <View style={styles.root}>{addressTo ? AddressTo() : AddressFrom()}</View>;
	};
}
