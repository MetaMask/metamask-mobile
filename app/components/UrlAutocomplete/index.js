import React, { Component } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';
import dappUrlList from '../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { colors, fontStyles } from '../../styles/common';
import { getHost } from '../../util/browser';

const styles = StyleSheet.create({
	wrapper: {
		paddingHorizontal: 15,
		paddingVertical: 15,
		flex: 1,
		backgroundColor: colors.white
	},
	bookmarkIco: {
		width: 26,
		height: 26,
		marginRight: 7,
		borderRadius: 13
	},
	fallbackTextStyle: {
		fontSize: 12
	},
	name: {
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	url: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	item: {
		flex: 1,
		marginBottom: 20
	},
	itemWrapper: {
		flexDirection: 'row',
		marginBottom: 20
	},
	textContent: {
		marginLeft: 10
	}
});

/**
 * Component that renders an autocomplete
 * based on an input string
 */
class UrlAutocomplete extends Component {
	static propTypes = {
		/**
		 * input text for the autocomplete
		 */
		input: PropTypes.string,
		/**
		 * Callback that is triggered while
		 * choosing one of the autocomplete options
		 */
		onSubmit: PropTypes.func,
		/**
		 * An array of visited urls and names
		 */
		browserHistory: PropTypes.array
	};

	state = {
		results: []
	};

	componentDidMount() {
		const allUrls = [...this.props.browserHistory, ...dappUrlList];
		const singleUrlList = [];
		const singleUrls = [];
		for (let i = 0; i < allUrls.length; i++) {
			const el = allUrls[i];
			if (!singleUrlList.includes(el.url)) {
				singleUrlList.push(el.url);
				singleUrls.push(el);
			}
		}

		this.fuse = new Fuse(singleUrls, {
			shouldSort: true,
			threshold: 0.45,
			location: 0,
			distance: 100,
			maxPatternLength: 32,
			minMatchCharLength: 1,
			keys: [{ name: 'name', weight: 0.5 }, { name: 'url', weight: 0.5 }]
		});
	}

	componentDidUpdate(prevProps) {
		if (prevProps.input !== this.props.input) {
			const fuseSearchResult = this.fuse.search(this.props.input);
			this.updateResults([...fuseSearchResult]);
		}
	}

	updateResults(results) {
		this.setState({ results });
	}

	render() {
		if (this.props.input.length < 2) return null;
		if (this.state.results.length === 0) return null;
		return (
			<View style={styles.wrapper}>
				{this.state.results.slice(0, 3).map(r => {
					const { url, name } = r;
					return (
						<TouchableOpacity
							containerStyle={styles.item}
							onPress={() => this.props.onSubmit(url)} // eslint-disable-line
							key={url}
						>
							<View style={styles.itemWrapper}>
								<WebsiteIcon
									style={styles.bookmarkIco}
									url={url}
									title={name}
									textStyle={styles.fallbackTextStyle}
								/>
								<View style={styles.textContent}>
									<Text style={styles.name}>{name || getHost(url)}</Text>
									<Text style={styles.url}>{url}</Text>
								</View>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	browserHistory: state.browser.history
});

export default connect(mapStateToProps)(UrlAutocomplete);
