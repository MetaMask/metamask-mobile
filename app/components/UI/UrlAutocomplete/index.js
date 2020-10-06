import React, { PureComponent } from 'react';
import { TouchableWithoutFeedback, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { colors, fontStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';

const styles = StyleSheet.create({
	wrapper: {
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
		marginBottom: 20,
		paddingHorizontal: 15
	},
	textContent: {
		flex: 1,
		marginLeft: 10
	},
	bg: {
		flex: 1
	}
});

/**
 * PureComponent that renders an autocomplete
 * based on an input string
 */
class UrlAutocomplete extends PureComponent {
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
		 * Callback that is triggered while
		 * tapping on the background
		 */
		onDismiss: PropTypes.func,
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

		this.timer = null;
		this.mounted = true;
	}

	componentDidUpdate(prevProps) {
		if (prevProps.input !== this.props.input) {
			if (this.timer) {
				clearTimeout(this.timer);
			}

			this.timer = setTimeout(() => {
				const fuseSearchResult = this.fuse.search(this.props.input);
				if (Array.isArray(fuseSearchResult)) {
					this.updateResults([...fuseSearchResult]);
				} else {
					this.updateResults([]);
				}
			}, 500);
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	updateResults(results) {
		this.mounted && this.setState({ results });
	}

	onSubmitInput = () => this.props.onSubmit(this.props.input);

	renderUrlOption = (url, name, onPress) => {
		name = typeof name === 'string' ? name : getHost(url);
		return (
			<TouchableOpacity containerStyle={styles.item} onPress={onPress} key={url}>
				<View style={styles.itemWrapper}>
					<WebsiteIcon
						style={styles.bookmarkIco}
						url={url}
						title={name}
						textStyle={styles.fallbackTextStyle}
					/>
					<View style={styles.textContent}>
						<Text style={styles.name} numberOfLines={1}>
							{name}
						</Text>
						<Text style={styles.url} numberOfLines={1}>
							{url}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	render() {
		if (!this.props.input || this.props.input.length < 2)
			return (
				<View style={styles.wrapper}>
					<TouchableWithoutFeedback style={styles.bg} onPress={this.props.onDismiss}>
						<View style={styles.bg} />
					</TouchableWithoutFeedback>
				</View>
			);
		if (this.state.results.length === 0) {
			return (
				<View style={styles.wrapper}>
					<TouchableOpacity containerStyle={styles.item} onPress={this.onSubmitInput}>
						<View style={styles.itemWrapper}>
							<View style={styles.textContent}>
								<Text style={styles.name} numberOfLines={1}>
									{this.props.input}
								</Text>
							</View>
						</View>
					</TouchableOpacity>
					<TouchableWithoutFeedback style={styles.bg} onPress={this.props.onDismiss}>
						<View style={styles.bg} />
					</TouchableWithoutFeedback>
				</View>
			);
		}
		return (
			<View style={styles.wrapper}>
				{this.state.results.slice(0, 3).map(r => {
					const { url, name } = r;
					const onPress = () => {
						this.props.onSubmit(url);
					};
					return this.renderUrlOption(url, name, onPress);
				})}
				<TouchableWithoutFeedback style={styles.bg} onPress={this.props.onDismiss}>
					<View style={styles.bg} />
				</TouchableWithoutFeedback>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	browserHistory: state.browser.history
});

export default connect(mapStateToProps)(UrlAutocomplete);
