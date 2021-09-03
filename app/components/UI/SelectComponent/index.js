import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-community/picker';
import { fontStyles, colors, baseStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import IconCheck from 'react-native-vector-icons/MaterialCommunityIcons';
import Device from '../../../util/device';

const PickerItem = Picker.Item;
const ROW_HEIGHT = 35;
const styles = StyleSheet.create({
	dropdown: {
		flexDirection: 'row',
	},
	iconDropdown: {
		marginTop: 7,
		height: 25,
		justifyContent: 'flex-end',
		textAlign: 'right',
		marginRight: 10,
	},
	selectedOption: {
		flex: 1,
		alignSelf: 'flex-start',
		color: colors.fontPrimary,
		fontSize: 14,
		paddingHorizontal: 15,
		paddingTop: 10,
		paddingBottom: 10,
		...fontStyles.normal,
	},
	accesoryBar: {
		width: '100%',
		paddingTop: 5,
		height: 50,
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1,
	},
	label: {
		textAlign: 'center',
		flex: 1,
		paddingVertical: 10,
		fontSize: 17,
		...fontStyles.bold,
	},
	modal: {
		margin: 0,
		width: '100%',
		padding: 60,
	},
	modalView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
	},
	list: {
		width: '100%',
	},
	optionButton: {
		paddingHorizontal: 15,
		paddingVertical: 5,
		flexDirection: 'row',
		height: ROW_HEIGHT,
	},
	optionLabel: {
		paddingVertical: 10,
		flex: 1,
		fontSize: 14,
		...fontStyles.normal,
	},
	icon: {
		paddingHorizontal: 10,
		marginTop: 5,
	},
	listWrapper: {
		flex: 1,
		paddingBottom: 10,
	},
});

export default class SelectComponent extends PureComponent {
	static propTypes = {
		/**
		 * Default value to show
		 */
		defaultValue: PropTypes.string,
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
		onValueChange: PropTypes.func,
	};

	state = {
		pickerVisible: false,
	};

	scrollView = Device.isIos() ? React.createRef() : null;

	onValueChange = (val) => {
		this.props.onValueChange(val);
		setTimeout(() => {
			this.hidePicker();
		}, 1000);
	};

	hidePicker = () => {
		this.setState({ pickerVisible: false });
	};

	showPicker = () => {
		dismissKeyboard();
		this.setState({ pickerVisible: true });
		Device.isIos() &&
			// If there are more options than 13 (number of items
			// that should fit in a normal screen)
			// then let's scroll to the selected item
			this.props.options.length > 13 &&
			this.props.options.forEach((item, i) => {
				if (item.value === this.props.selectedValue) {
					setTimeout(() => {
						this.scrollView &&
							this.scrollView.current &&
							this.scrollView.current.scrollTo({ x: 0, y: i * ROW_HEIGHT, animated: true });
					}, 100);
				}
			});
	};

	getSelectedValue = () => {
		const { options, selectedValue, defaultValue } = this.props;
		const el = options && options.filter((o) => o.value === selectedValue);
		if (el.length && el[0].label) {
			return el[0].label;
		}
		if (defaultValue) {
			return defaultValue;
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
				{this.props.options.map((option) => (
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
				onBackdropPress={this.hidePicker}
				onBackButtonPress={this.hidePicker}
				style={styles.modal}
				useNativeDriver
			>
				<View style={styles.modalView}>
					<View style={styles.accesoryBar}>
						<Text style={styles.label}>{this.props.label}</Text>
					</View>
					<ScrollView style={styles.list} ref={this.scrollView}>
						<View style={styles.listWrapper}>
							{this.props.options.map((option) => (
								<TouchableOpacity
									// eslint-disable-next-line react/jsx-no-bind
									onPress={() => this.onValueChange(option.value)}
									style={styles.optionButton}
									key={option.key}
								>
									<Text style={styles.optionLabel} numberOfLines={1}>
										{option.label}
									</Text>
									{this.props.selectedValue === option.value ? (
										<IconCheck style={styles.icon} name="check" size={24} color={colors.blue} />
									) : null}
								</TouchableOpacity>
							))}
						</View>
					</ScrollView>
				</View>
			</Modal>
		</View>
	);

	render = () => (
		<View style={baseStyles.flexGrow}>{Device.isAndroid() ? this.renderAndroid() : this.renderIOS()}</View>
	);
}
