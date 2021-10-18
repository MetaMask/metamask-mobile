import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../../../styles/common';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Alert, { AlertType } from '../../../Base/Alert';

type Props = {
	/**
	 * Warning message to display (Plain text or JSX)
	 */
	warningMessage: ReactNode;
	style?: StyleProp<ViewStyle>;
};

const WarningMessage = ({ warningMessage, style }: Props) => {
	return (
		<Alert
			type={AlertType.Warning}
			style={style}
			renderIcon={() => (
				<FontAwesome
					style={styles.icon}
					name={'exclamation-circle'}
					color={colors.yellowWarningIcon}
					size={18}
				/>
			)}
		>
			{warningMessage}
		</Alert>
	);
};

const styles = StyleSheet.create({
	icon: {
		paddingTop: 4,
		paddingRight: 8
	}
});

export default WarningMessage;
