import React, { Component } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';
import dappUrlList from '../../util/dapp-url-list';
import Fuse from 'fuse.js';
import WebsiteIcon from '../WebsiteIcon';
import { colors, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		paddingHorizontal: 15,
		paddingVertical: 15,
		flex: 1,
		backgroundColor: colors.white,
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
		marginBottom: 20,
	},
	itemWrapper: {
		flexDirection: 'row',
		marginBottom: 20,
	},

});



const fuse = new Fuse(dappUrlList, {
	shouldSort: true,
	threshold: 0.45,
	location: 0,
	distance: 100,
	maxPatternLength: 32,
	minMatchCharLength: 1,
	keys: [{ name: 'name', weight: 0.5 }, { name: 'url', weight: 0.5 }]
});

export default class UrlAutocomplete extends Component {

	state = {
		results: []
	}

	componentDidUpdate(prevProps){
		if(prevProps.input !== this.props.input){
			const fuseSearchResult = fuse.search(this.props.input);
			this.setState({results: [...fuseSearchResult]});
		}
	}

	render() {
		if(this.props.input.length < 2) return null;
		if(this.state.results.length === 0) return null;
		return (
			<View style={styles.wrapper}>
				{
					this.state.results.slice(0, 6).map((r, i) => {
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
									<View>
										<Text style={styles.name}>
											{name}
										</Text>
										<Text style={styles.url}>
											{url}
										</Text>
									</View>
								</View>
							</TouchableOpacity>
						);
					})
				}

			</View>
		);
	}
}
