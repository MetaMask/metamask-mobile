import React from 'react';
import { StyleSheet, View } from 'react-native';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
import { colors } from '../../../../styles/common';

const styles = StyleSheet.create({
	buttonView: {
		flexDirection: 'row',
		paddingVertical: 16,
	},
	button: {
		flex: 1,
	},
	cancel: {
		marginRight: 8,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderWidth: 1,
	},
	confirm: {
		marginLeft: 8,
	},
});

interface NetworkAddedProps {
	nickname: string;
	goHome: () => void;
	switchNetwork: () => void;
}

const NetworkAdded = (props: NetworkAddedProps) => {
	const { nickname, goHome, switchNetwork } = props;

	return (
		<View>
			<Text centered bold black big>
				{strings('networks.new_network')}
			</Text>
			<Text centered>
				<Text bold>{`"${strings('networks.network_name', { networkName: nickname })}"`}</Text>
				<Text>{strings('networks.network_added')}</Text>
			</Text>
			<View style={styles.buttonView}>
				<StyledButton type={'cancel'} onPress={goHome} containerStyle={[styles.button, styles.cancel]}>
					{strings('networks.close')}
				</StyledButton>
				<StyledButton type={'confirm'} onPress={switchNetwork} containerStyle={[styles.button, styles.confirm]}>
					{strings('networks.switch_network')}
				</StyledButton>
			</View>
		</View>
	);
};

export default NetworkAdded;
