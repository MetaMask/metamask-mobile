import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import ProgressBar from 'react-native-progress/Bar';
import FadeView from '../FadeView';

/**
 * PureComponent that wraps the ProgressBar
 * and allows to fade it in / out
 * via the boolean prop visible
 */
export default class WebviewProgressBar extends PureComponent {
	state = {
		visible: true,
	};

	static propTypes = {
		/**
		 * Float that represents the progress complete
		 * between 0 and 1
		 */
		progress: PropTypes.any,
	};

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentDidUpdate() {
		if (this.props.progress === 1) {
			this.hide();
		} else if (!this.state.visible && this.props.progress !== 1) {
			this.show();
		}
	}

	hide() {
		setTimeout(() => {
			this.mounted && this.setState({ visible: false });
		}, 300);
	}

	show() {
		this.mounted && this.setState({ visible: true });
	}

	render = () => (
		<FadeView visible={this.state.visible}>
			<ProgressBar
				progress={this.props.progress}
				color={colors.blue}
				width={null}
				height={3}
				borderRadius={0}
				borderWidth={0}
				useNativeDriver
			/>
		</FadeView>
	);
}
