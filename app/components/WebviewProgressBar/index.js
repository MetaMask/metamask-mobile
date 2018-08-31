import React from 'react';
import PropTypes from 'prop-types';
import { colors } from '../../styles/common';
import ProgressBar from 'react-native-progress/Bar';
import FadeView from '../FadeView';

/**
 * Component that wraps the ProgressBar
 * and allows to fade it in / out
 * via the boolean prop visible
 */
const WebviewProgressBar = props => {
	const visible = props.progress !== 1;
	return (
		<FadeView visible={visible}>
			<ProgressBar
				progress={props.progress}
				color={colors.primary}
				width={null}
				height={3}
				borderRadius={0}
				borderWidth={0}
				useNativeDriver
			/>
		</FadeView>
	);
};

WebviewProgressBar.propTypes = {
	/**
	 * Float that represents the progress complete
	 * between 0 and 1
	 */
	progress: PropTypes.any
};

export default WebviewProgressBar;
