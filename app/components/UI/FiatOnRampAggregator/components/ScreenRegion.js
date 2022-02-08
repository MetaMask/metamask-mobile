import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, SafeAreaView } from 'react-native';
// import Device from '../../util/device';
import { colors, fontStyles } from '../../../../styles/common';
import ScreenView from '../../FiatOrders/components/ScreenView';
import Text from '../../../Base/Text';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
	container: {
		backgroundColor: colors.white,
		padding: 15,
		flex: 1,
		// TODO(wachunei): check if this can be removed without breaking anything
		// minHeight: Device.isIos() ? 55 : 100
	},
	header: {
		color: colors.fontSecondary,
		fontSize: 16,
		marginTop: 10,
		marginBottom: 20,
		textAlign: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		...fontStyles.normal,
		backgroundColor: colors.white,
	},
	headerTitle: {
		textAlign: 'center',
		color: colors.black,
	},
	headerDescription: {
		textAlign: 'center',
	},
	body: {
		flex: 1,
		backgroundColor: colors.yellow200,
		alignSelf: 'stretch',
	},
	footer: {
		marginVertical: 10,
		alignItems: 'center',
	},
});

const ScreenRegion = ({ style, ...props }) => (
	<SafeAreaView style={styles.wrapper}>
		<View style={[styles.container, style]} {...props} />
	</SafeAreaView>
);

const ScreenRegionHeader = ({ style, children, title, description, bold, ...props }) => (
	<View style={[styles.header, style]} {...props}>
		{title && (
			<Text bold={bold} style={styles.headerTitle}>
				{title}
			</Text>
		)}
		{description && <Text style={styles.headerDescription}>{description}</Text>}
		{children}
	</View>
);
const ScreenRegionBody = ({ style, children, ...props }) => (
	<View style={[styles.body, style]} {...props}>
		<ScreenView>{children}</ScreenView>
	</View>
);
const ScreenRegionFooter = ({ style, ...props }) => <View style={[styles.footer, style]} {...props} />;

ScreenRegion.Header = ScreenRegionHeader;
ScreenRegion.Body = ScreenRegionBody;
ScreenRegion.Footer = ScreenRegionFooter;

export default ScreenRegion;

/**
 * Any other external style defined in props will be applied
 */
const stylePropType = PropTypes.oneOfType([PropTypes.object, PropTypes.array]);

ScreenRegion.propTypes = {
	style: stylePropType,
};
ScreenRegionHeader.propTypes = {
	style: stylePropType,
	title: PropTypes.string,
	description: PropTypes.string,
	bold: PropTypes.any,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};
ScreenRegionBody.propTypes = {
	style: stylePropType,
	children: PropTypes.any,
};
ScreenRegionFooter.propTypes = {
	style: stylePropType,
};
