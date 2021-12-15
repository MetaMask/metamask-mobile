import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { useAppThemeFromContext } from '../../../util/theme';
import { useDispatch, useSelector } from 'react-redux';
import { AppThemeNames, AppThemeLabels } from '../../../util/theme/models';
import { setAppTheme } from '../../../actions/user';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fontStyles } from '../../../styles/common';

const ThemeSettings = () => {
	const safeAreaInsets = useSafeAreaInsets();
	const modalRef = useRef<ReusableModalRef>(null);
	const dispatch = useDispatch();
	const triggerSetAppTheme = (theme: AppThemeNames) => dispatch(setAppTheme(theme));

	const appTheme: AppThemeNames = useSelector((state: any) => state.user.appTheme);
	const { colors } = useAppThemeFromContext();

	const styles = StyleSheet.create({
		screen: { justifyContent: 'flex-end' },
		sheet: {
			backgroundColor: colors.backgroundDefault,
			borderTopLeftRadius: 16,
			borderTopRightRadius: 16,
			paddingBottom: safeAreaInsets.bottom + 16,
		},
		notch: {
			width: 52,
			height: 6,
			borderRadius: 3,
			backgroundColor: colors.borderDefault,
			marginBottom: 24,
			marginTop: 10,
			alignSelf: 'center',
		},
		option: {
			height: 60,
			borderTopWidth: 0.5,
			borderColor: colors.borderDefault,
		},
		optionButton: {
			flex: 1,
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 16,
		},
		optionLabel: {
			color: colors.textDefault,
			fontSize: 16,
			fontFamily: fontStyles.normal.fontFamily,
		},
	});

	const renderThemeOptions = useCallback(() => {
		return (
			<View>
				{Object.keys(AppThemeNames).map((themeKey) => {
					const key = `${themeKey}-theme`;
					const selectedThemeName = themeKey.toLowerCase() as AppThemeNames;
					const label = AppThemeLabels[selectedThemeName];
					const selectedIcon =
						appTheme === selectedThemeName ? (
							<Icon name="check-circle" size={30} color={colors.primary} />
						) : null;

					return (
						<View key={key} style={styles.option}>
							<TouchableOpacity
								onPress={() => {
									triggerSetAppTheme(selectedThemeName);
									modalRef.current?.dismissModal();
								}}
								style={styles.optionButton}
							>
								<Text style={styles.optionLabel}>{label}</Text>
								{selectedIcon}
							</TouchableOpacity>
						</View>
					);
				})}
			</View>
		);
	}, [appTheme, triggerSetAppTheme, styles]);

	return (
		<ReusableModal ref={modalRef} style={styles.screen}>
			<View style={styles.sheet}>
				<View style={styles.notch} />
				{renderThemeOptions()}
			</View>
		</ReusableModal>
	);
};

export default ThemeSettings;
