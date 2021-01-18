import { debounce } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

const propTypes = {
	onPress: PropTypes.func.isRequired
};

const withPreventDoubleClick = WrappedComponent => {
	class PreventDoubleClick extends Component {
		debouncedOnPress = () => {
			this.props.onPress && this.props.onPress();
		};

		onPress = debounce(this.debouncedOnPress, 300, { leading: true, trailing: false });

		render() {
			return <WrappedComponent {...this.props} onPress={this.onPress} />;
		}
	}

	const name = WrappedComponent.displayName || WrappedComponent.name;
	PreventDoubleClick.propTypes = propTypes;
	PreventDoubleClick.displayName = `withPreventDoubleClick(${name})`;
	return PreventDoubleClick;
};

export default withPreventDoubleClick;
