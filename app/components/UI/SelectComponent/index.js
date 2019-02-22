import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, Platform, TouchableOpacity, Picker } from 'react-native';
import { fontStyles, colors, baseStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';

const PickerItem = Picker.Item;
const styles = StyleSheet.create({
	dropdown: {
		flexDirection: 'row'
	},
	iconDropdown: {
		marginTop: 7,
		height: 25,
		justifyContent: 'flex-end',
		textAlign: 'right',
		marginRight: 10
	},
	selectedOption: {
		flex: 1,
		alignSelf: 'flex-start',
		color: colors.fontPrimary,
		fontSize: 14,
		paddingHorizontal: 15,
		paddingTop: 10,
		paddingBottom: 10,
		...fontStyles.normal
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	accesoryBar: {
		padding: 5,
		backgroundColor: colors.slate,
		flexDirection: 'row'
	},
	label: {
		textAlign: 'center',
		flex: 1,
		paddingVertical: 10,
		fontSize: 17,
		...fontStyles.normal
	},
	modalContent: {
		backgroundColor: colors.white
	}
});

export default class SelectComponent extends Component {
	static propTypes = {
		/**
		 * Label for the field
		 */
		label: PropTypes.string,
		/**
		 * Selected value
		 */
		selectedValue: PropTypes.string,
		/**
		 *  Available options
		 */
		options: PropTypes.array,
		/**
		 * Callback for value change
		 */
		onValueChange: PropTypes.func
	};

	state = {
		pickerVisible: false
	};

	onValueChange = val => this.props.onValueChange(val);

	hidePicker = () => {
		this.setState({ pickerVisible: false });
	};

	showPicker = () => {
		dismissKeyboard();
		this.setState({ pickerVisible: true });
	};

	getSelectedValue = () => {
		const el = this.props.options && this.props.options.filter(o => o.value === this.props.selectedValue);
		if (el.length && el[0].label) {
			return el[0].label;
		}
		return '';
	};

	renderAndroid = () => (
		<View style={baseStyles.flexGrow}>
			<Picker
				selectedValue={this.props.selectedValue}
				onValueChange={this.onValueChange}
				prompt={this.props.label}
			>
				{this.props.options.map(option => (
					<PickerItem value={option.value} label={option.label} key={option.key} />
				))}
			</Picker>
		</View>
	);

	renderIOS = () => (
		<View style={baseStyles.flexGrow}>
			<TouchableOpacity onPress={this.showPicker}>
				<View style={styles.dropdown}>
					<Text style={styles.selectedOption} numberOfLines={1}>
						{this.getSelectedValue()}
					</Text>
					<Icon name={'arrow-drop-down'} size={24} color={colors.fontPrimary} style={styles.iconDropdown} />
				</View>
			</TouchableOpacity>
			<Modal
				isVisible={this.state.pickerVisible}
				style={styles.bottomModal}
				onBackdropPress={this.hidePicker}
				useNativeDriver
			>
				<View style={styles.modalContent}>
					<View style={styles.accesoryBar}>
						<Text style={styles.label}>{this.props.label}</Text>
					</View>
					<Picker
						itemStyle={styles.itemStyle}
						selectedValue={this.props.selectedValue}
						onValueChange={this.onValueChange}
					>
						{this.props.options.map(option => (
							<PickerItem value={option.value} label={option.label} key={option.key} />
						))}
					</Picker>
				</View>
			</Modal>
		</View>
	);

	render = () => (
		<View style={baseStyles.flexGrow}>{Platform.OS === 'android' ? this.renderAndroid() : this.renderIOS()}</View>
	);
}
