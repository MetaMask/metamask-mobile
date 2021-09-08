import React, { PureComponent } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';

const defaultMargin = 4;

const styles = StyleSheet.create({
	wrapper: {
		width: Dimensions.get('window').width,
		flexDirection: 'row',
	},
	page: {
		height: 7,
		backgroundColor: colors.grey100,
		marginRight: defaultMargin,
	},
	selected: {
		backgroundColor: colors.blue,
	},
});

export default class Pager extends PureComponent {
	static propTypes = {
		/**
		 * Number of pages
		 */
		pages: PropTypes.number,
		/**
		 * The number of the selected page (1 index based)
		 */
		selected: PropTypes.number,
	};

	render() {
		const width = Dimensions.get('window').width;
		const pageWidth = (width - defaultMargin * (this.props.pages - 1)) / this.props.pages;

		return (
			<View style={styles.wrapper}>
				{Array(this.props.pages)
					.fill(0)
					.map((_, i) => (
						<View
							key={`pager_page_${i}`}
							style={[
								styles.page,
								{ width: pageWidth },
								this.props.selected >= i + 1 ? styles.selected : null,
							]}
						/>
					))}
			</View>
		);
	}
}
