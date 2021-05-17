import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../../styles/common';
import Text from '../../Base/Text';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		borderRadius: 12,
		backgroundColor: colors.grey100
	},
	content: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	item: {
		marginVertical: 5
	},
	text: {
		fontSize: 16
	}
});

function Loader({ error }) {
	return (
		<View style={styles.container}>
			<View style={styles.content}>
				<View style={styles.item}>
					{error ? (
						<FA5Icon name="video-slash" color={colors.grey400} size={40} />
					) : (
						<ActivityIndicator color={colors.grey400} size="large" />
					)}
				</View>
				<View style={styles.item}>
					<Text style={styles.text} black>
						{error ? 'Media not found' : 'Loading...'}
					</Text>
				</View>
			</View>
		</View>
	);
}

Loader.propTypes = {
	error: PropTypes.bool
};

Loader.defaultProps = {
	onError: () => null
};

export default Loader;
