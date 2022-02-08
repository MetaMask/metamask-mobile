import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, SafeAreaView, ScrollView } from 'react-native';
import { colors } from '../../../../styles/common';
import Text from '../../../Base/Text';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
	container: {
		backgroundColor: colors.white,
		padding: 15,
		flex: 1,
	},
	header: {
		marginTop: 10,
		marginBottom: 20,
	},
	body: {
		flex: 1,
	},
	footer: {
		marginVertical: 10,
		alignItems: 'center',
	},
});

const ScreenRegion = ({ style, scrollable, ...props }) => {
	const Component = scrollable ? ScrollView : View;
	return (
		<SafeAreaView style={styles.wrapper}>
			<Component style={[styles.container, style]} {...props} />
		</SafeAreaView>
	);
};

const Header = ({ style, children, title, description, bold, ...props }) => (
	<View style={[styles.header, style]} {...props}>
		{title && (
			<Text big black centered bold={bold}>
				{title}
			</Text>
		)}
		{description && <Text centered>{description}</Text>}
		{children}
	</View>
);
const Body = ({ style, ...props }) => <View style={[styles.body, style]} {...props} />;
const Footer = ({ style, ...props }) => <View style={[styles.footer, style]} {...props} />;

ScreenRegion.Header = Header;
ScreenRegion.Body = Body;
ScreenRegion.Footer = Footer;

export default ScreenRegion;

/**
 * Any other external style defined in props will be applied
 */
const stylePropType = PropTypes.oneOfType([PropTypes.object, PropTypes.array]);

ScreenRegion.propTypes = {
	style: stylePropType,
	scrollable: PropTypes.bool,
};
Header.propTypes = {
	style: stylePropType,
	title: PropTypes.string,
	description: PropTypes.string,
	bold: PropTypes.any,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};
Body.propTypes = {
	style: stylePropType,
	children: PropTypes.any,
};
Footer.propTypes = {
	style: stylePropType,
};
