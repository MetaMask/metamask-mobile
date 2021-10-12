import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import ConnectHeader from '../../ConnectHeader';
import Device from '../../../../util/device';
import ErrorMessage from '../../../Views/SendFlow/ErrorMessage';

export const MINIMUM_VALUE = '1';

const styles = StyleSheet.create({
	wrapper: {
		paddingHorizontal: 24,
		paddingTop: 24,
		paddingBottom: Device.isIphoneX() ? 48 : 24,
		backgroundColor: colors.white,
		borderTopRightRadius: 20,
		borderTopLeftRadius: 20,
	},
	sectionExplanationText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		marginVertical: 6,
	},
	option: {
		flexDirection: 'row',
		marginVertical: 8,
	},
	errorMessageWrapper: {
		marginVertical: 6,
	},
	optionText: {
		...fontStyles.normal,
		fontSize: 14,
		lineHeight: 20,
	},
	touchableOption: {
		flexDirection: 'row',
	},
	selectedCircle: {
		width: 8,
		height: 8,
		borderRadius: 8 / 2,
		margin: 3,
		backgroundColor: colors.blue,
	},
	outSelectedCircle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		borderWidth: 2,
		borderColor: colors.blue,
	},
	circle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		backgroundColor: colors.white,
		opacity: 1,
		borderWidth: 2,
		borderColor: colors.grey200,
	},
	input: {
		padding: 12,
		borderColor: colors.grey200,
		borderRadius: 10,
		borderWidth: 2,
	},
	spendLimitContent: {
		marginLeft: 8,
		flex: 1,
	},
	spendLimitTitle: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 8,
	},
	spendLimitSubtitle: {
		...fontStyles.normal,
		fontSize: 12,
		lineHeight: 18,
		color: colors.grey500,
	},
	textBlue: {
		color: colors.blue,
	},
	textBlack: {
		color: colors.black,
	},
});

function EditPermission({
	host,
	minimumSpendLimit,
	spendLimitUnlimitedSelected,
	tokenSymbol,
	spendLimitCustomValue,
	originalApproveAmount,
	onSetApprovalAmount: setApprovalAmount,
	onSpendLimitCustomValueChange,
	onPressSpendLimitUnlimitedSelected,
	onPressSpendLimitCustomSelected,
	toggleEditPermission,
}) {
	const [initialState] = useState({ spendLimitUnlimitedSelected, spendLimitCustomValue });

	const displayErrorMessage = useMemo(
		() => !spendLimitUnlimitedSelected && Number(minimumSpendLimit) > spendLimitCustomValue,
		[spendLimitUnlimitedSelected, spendLimitCustomValue, minimumSpendLimit]
	);

	const onSetApprovalAmount = useCallback(() => {
		if (!spendLimitUnlimitedSelected && !spendLimitCustomValue) {
			onPressSpendLimitUnlimitedSelected();
		} else {
			setApprovalAmount();
		}
	}, [spendLimitUnlimitedSelected, spendLimitCustomValue, onPressSpendLimitUnlimitedSelected, setApprovalAmount]);

	const onBackPress = useCallback(() => {
		const { spendLimitUnlimitedSelected, spendLimitCustomValue } = initialState;
		if (spendLimitUnlimitedSelected) {
			onPressSpendLimitUnlimitedSelected();
		} else {
			onPressSpendLimitCustomSelected();
		}
		onSpendLimitCustomValueChange(spendLimitCustomValue);
		toggleEditPermission();
	}, [
		initialState,
		onPressSpendLimitCustomSelected,
		onPressSpendLimitUnlimitedSelected,
		onSpendLimitCustomValueChange,
		toggleEditPermission,
	]);

	return (
		<View style={styles.wrapper}>
			<ConnectHeader action={onBackPress} title={strings('spend_limit_edition.title')} />
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
								spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack,
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
								!spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack,
							]}
						>
							{strings('spend_limit_edition.custom_spend_limit')}
						</Text>
						<Text style={styles.sectionExplanationText}>
							{strings('spend_limit_edition.max_spend_limit')}
						</Text>
						<TextInput
							autoCapitalize="none"
							keyboardType="numeric"
							autoCorrect={false}
							onChangeText={onSpendLimitCustomValueChange}
							placeholder={`100 ${tokenSymbol}`}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							style={styles.input}
							value={spendLimitCustomValue}
							numberOfLines={1}
							onFocus={onPressSpendLimitCustomSelected}
							returnKeyType={'done'}
						/>
						{displayErrorMessage && (
							<View style={styles.errorMessageWrapper}>
								<ErrorMessage
									errorMessage={strings('spend_limit_edition.must_be_at_least', {
										allowance: minimumSpendLimit,
									})}
								/>
							</View>
						)}
					</View>
				</View>
			</View>
			<StyledButton disabled={displayErrorMessage} type="confirm" onPress={onSetApprovalAmount}>
				{strings('transaction.set_gas')}
			</StyledButton>
		</View>
	);
}
EditPermission.defaultProps = {
	minimumSpendLimit: MINIMUM_VALUE,
};

EditPermission.propTypes = {
	host: PropTypes.string.isRequired,
	minimumSpendLimit: PropTypes.string,
	spendLimitUnlimitedSelected: PropTypes.bool.isRequired,
	tokenSymbol: PropTypes.string.isRequired,
	spendLimitCustomValue: PropTypes.string.isRequired,
	originalApproveAmount: PropTypes.string.isRequired,
	onPressSpendLimitUnlimitedSelected: PropTypes.func.isRequired,
	onPressSpendLimitCustomSelected: PropTypes.func.isRequired,
	onSpendLimitCustomValueChange: PropTypes.func.isRequired,
	onSetApprovalAmount: PropTypes.func.isRequired,
	toggleEditPermission: PropTypes.func.isRequired,
};

export default EditPermission;
