import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text } from 'react-native';

export default class ErrorBoundary extends Component {
	static propTypes = {
		children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node])
	};

	constructor(props) {
		super(props);
		this.state = {
			error: null,
			errorInfo: null
		};
	}

	componentDidCatch(error, errorInfo) {
		// Catch errors in any components below and re-render with error message
		this.setState({
			error,
			errorInfo
		});
		// You can also log error messages to an error reporting service here
	}

	render() {
		if (this.state.errorInfo) {
			// Error path
			return (
				<View>
					<Text>Something went wrong.</Text>
					<View>
						<Text>{this.state.error && this.state.error.toString()}</Text>
						<Text>{this.state.errorInfo.componentStack}</Text>
					</View>
				</View>
			);
		}
		// Normally, just render children
		return this.props.children;
	}
}
