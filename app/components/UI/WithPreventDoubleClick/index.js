import { debounce } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

export const withPreventDoubleClickErrorMsg = 'Expected Component to wrap';

export const withPreventDoubleClick = WrappedComponent => {
	if (!WrappedComponent) {
		throw new Error(withPreventDoubleClickErrorMsg);
	}
	class PreventDoubleClick extends Component {
		debouncedOnPress = () => {
			this.props.onPress && this.props.onPress();
		};

		onPress = debounce(this.debouncedOnPress, 300, { leading: true, trailing: false });

		render() {
			return <WrappedComponent {...this.props} onPress={this.onPress} />;
		}
	}
	const propTypes = {
		onPress: PropTypes.func.isRequired
	};
	const name = WrappedComponent.displayName || WrappedComponent.name;
	PreventDoubleClick.propTypes = propTypes;
	PreventDoubleClick.displayName = `withPreventDoubleClick(${name})`;
	return PreventDoubleClick;
};
