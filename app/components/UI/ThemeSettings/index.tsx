import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { useAppThemeFromContext } from '../../../util/theme';

const ThemeSettings = () => {
	const modalRef = useRef<ReusableModalRef>(null);
	const { colors } = useAppThemeFromContext();

	const styles = StyleSheet.create({
		screen: { justifyContent: 'flex-end' },
		sheet: {
			backgroundColor: colors.backgroundDefault,
			height: 300,
			borderTopLeftRadius: 16,
			borderTopRightRadius: 16,
		},
	});

	return (
		<ReusableModal ref={modalRef} style={styles.screen}>
			<View style={styles.sheet} />
		</ReusableModal>
	);
};

export default ThemeSettings;
