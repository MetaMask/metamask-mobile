import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Device from '../../../../util/Device';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ConnectHeader from '../../ConnectHeader';

const styles = StyleSheet.create({
	section: {
		minWidth: '100%',
		width: '100%',
		paddingVertical: 10
	},
	title: {
		...fontStyles.bold,
		fontSize: 24,
		textAlign: 'center',
		color: colors.black,
		lineHeight: 34,
		marginVertical: 16,
		paddingHorizontal: 16
	},
	explanation: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.black,
		lineHeight: 20,
		paddingHorizontal: 16
	},
	editPermissionWrapper: {
		paddingHorizontal: 16,
		paddingBottom: 16
	},
	editPermissionText: {
		...fontStyles.bold,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 20,
		textAlign: 'center',
		marginVertical: 20,
		borderWidth: 1,
		borderRadius: 20,
		borderColor: colors.blue,
		paddingVertical: 8,
		paddingHorizontal: 16
	},
	viewDetailsText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 16,
		marginTop: 20,
		textAlign: 'center'
	},
	actionTouchable: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	sectionExplanationText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		marginVertical: 6
	},
	sectionLeft: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		flex: 1
	},
	sectionRight: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		flex: 1,
		textTransform: 'uppercase',
		textAlign: 'right'
	},
	option: {
		flexDirection: 'row',
		marginVertical: 8
	},
	optionText: {
		...fontStyles.normal,
		fontSize: 14,
		lineHeight: 20
	},
	touchableOption: {
		flexDirection: 'row'
	},
	selectedCircle: {
		width: 8,
		height: 8,
		borderRadius: 8 / 2,
		margin: 3,
		backgroundColor: colors.blue
	},
	outSelectedCircle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		borderWidth: 2,
		borderColor: colors.blue
	},
	circle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		backgroundColor: colors.white,
		opacity: 1,
		borderWidth: 2,
		borderColor: colors.grey200
	},
	input: {
		padding: 12,
		borderColor: colors.grey200,
		borderRadius: 10,
		borderWidth: 2
	},
	spendLimitContent: {
		marginLeft: 8,
		flex: 1
	},
	spendLimitTitle: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 8
	},
	spendLimitSubtitle: {
		...fontStyles.normal,
		fontSize: 12,
		lineHeight: 18,
		color: colors.grey500
	},
	textBlue: {
		color: colors.blue
	},
	textBlack: {
		color: colors.black
	},
	errorWrapper: {
		// marginHorizontal: 24,
		marginTop: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	error: {
		color: colors.red,
		fontSize: 12,
		...fontStyles.normal,
		textAlign: 'center'
	},
	underline: {
		textDecorationLine: 'underline',
		...fontStyles.bold
	},
	actionViewWrapper: {
		height: Device.isMediumDevice() ? 200 : 350
	},
	actionViewChildren: {
		height: 300
	},
	paddingHorizontal: {
		paddingHorizontal: 16
	}
});

function EditPermission({
	host,
	spendLimitUnlimitedSelected,
	tokenSymbol,
	spendLimitCustomValue,
	originalApproveAmount,
	onPressSpendLimitUnlimitedSelected,
	onPressSpendLimitCustomSelected,
	toggleEditPermission
}) {
	return (
		<View style={[baseStyles.section, styles.editPermissionWrapper]}>
			<KeyboardAwareScrollView resetScrollToCoords={{ x: 0, y: 0 }}>
				<ConnectHeader action={toggleEditPermission} title={strings('spend_limit_edition.title')} />
				<View>
					<Text style={styles.spendLimitTitle}>{strings('spend_limit_edition.spend_limit')}</Text>
					<Text style={styles.spendLimitSubtitle}>
						{strings('spend_limit_edition.allow')}
						<Text style={fontStyles.bold}>{` ${host} `}</Text>
						{strings('spend_limit_edition.allow_explanation')}
					</Text>

					<View style={styles.option}>
						<TouchableOpacity onPress={onPressSpendLimitUnlimitedSelected} style={styles.touchableOption}>
							{spendLimitUnlimitedSelected ? (
								<View style={styles.outSelectedCircle}>
									<View style={styles.selectedCircle} />
								</View>
							) : (
								<View style={styles.circle} />
							)}
						</TouchableOpacity>
						<View style={styles.spendLimitContent}>
							<Text
								style={[
									styles.optionText,
									spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack
								]}
							>
								{strings('spend_limit_edition.proposed')}
							</Text>
							<Text style={styles.sectionExplanationText}>
								{strings('spend_limit_edition.requested_by')}
								<Text style={fontStyles.bold}>{` ${host}`}</Text>
							</Text>
							<Text
								style={[styles.optionText, styles.textBlack]}
							>{`${originalApproveAmount} ${tokenSymbol}`}</Text>
						</View>
					</View>

					<View style={styles.option}>
						<TouchableOpacity onPress={onPressSpendLimitCustomSelected} style={styles.touchableOption}>
							{spendLimitUnlimitedSelected ? (
								<View style={styles.circle} />
							) : (
								<View style={styles.outSelectedCircle}>
									<View style={styles.selectedCircle} />
								</View>
							)}
						</TouchableOpacity>
						<View style={styles.spendLimitContent}>
							<Text
								style={[
									styles.optionText,
									!spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack
								]}
							>
								{strings('spend_limit_edition.custom_spend_limit')}
							</Text>
							<Text style={styles.sectionExplanationText}>
								{strings('spend_limit_edition.max_spend_limit')}
							</Text>
							<TextInput
								ref={this.customSpendLimitInput}
								autoCapitalize="none"
								keyboardType="numeric"
								autoCorrect={false}
								onChangeText={this.onSpendLimitCustomValueChange}
								placeholder={`100 ${tokenSymbol}`}
								placeholderTextColor={colors.grey100}
								spellCheck={false}
								style={styles.input}
								value={spendLimitCustomValue}
								numberOfLines={1}
								onFocus={onPressSpendLimitCustomSelected}
								returnKeyType={'done'}
							/>
							<Text style={styles.sectionExplanationText}>
								{strings('spend_limit_edition.minimum', { tokenSymbol })}
							</Text>
						</View>
					</View>
				</View>
				<StyledButton type="confirm" onPress={toggleEditPermission}>
					{strings('transaction.set_gas')}
				</StyledButton>
			</KeyboardAwareScrollView>
		</View>
	);
}

EditPermission.propTypes = {
	host: PropTypes.string,
	spendLimitUnlimitedSelected: PropTypes.bool,
	tokenSymbol: PropTypes.string,
	spendLimitCustomValue: PropTypes.string,
	originalApproveAmount: PropTypes.string,
	onPressSpendLimitUnlimitedSelected: PropTypes.func,
	onPressSpendLimitCustomSelected: PropTypes.func,
	toggleEditPermission: PropTypes.func
};

export default EditPermission;
