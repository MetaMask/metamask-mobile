import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import WebsiteIcon from '../../WebsiteIcon';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/Device';
import { getHost } from '../../../../util/browser';

const styles = StyleSheet.create({
	expandedRoot: {
		...baseStyles.flexGrow,
		backgroundColor: colors.white,
		maxHeight: '75%',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	expandedMessageHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20
	},
	arrowIcon: {
		...baseStyles.flexGrow,
		color: colors.grey200
	},
	iconHidden: {
		...baseStyles.flexGrow
	},
	messageLabelTextExpanded: {
		...baseStyles.flexGrow,
		textAlign: 'center',
		...fontStyles.bold,
		fontSize: 16
	},
	messageIntroWrapper: {
		alignItems: 'center',
		marginBottom: 20
	},
	domainLogo: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginBottom: 20
	},
	messageFromLabel: {
		textAlign: 'center',
		...fontStyles.bold,
		fontSize: 16
	},
	scrollView: {
		flex: 1
	}
});

/**
 * Component that supports eth_signTypedData and eth_signTypedData_v3
 */
export default class ExpandedMessage extends PureComponent {
	static propTypes = {
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * Renders the message based on its type (parent)
		 */
		renderMessage: PropTypes.func,
		/**
		 * Expands the message box on press.
		 */
		toggleExpandedMessage: PropTypes.func
	};

	render() {
		const { currentPageInformation, renderMessage, toggleExpandedMessage } = this.props;
		const url = currentPageInformation.url;
		const title = getHost(url);
		return (
			<View style={styles.expandedRoot}>
				<TouchableOpacity style={styles.expandedMessageHeader} onPress={toggleExpandedMessage}>
					<Ionicons name={'ios-arrow-back'} size={30} style={styles.arrowIcon} />
					<Text style={styles.messageLabelTextExpanded}>{strings('signature_request.message')}</Text>
					<View style={styles.iconHidden} />
				</TouchableOpacity>
				<View style={styles.messageIntroWrapper}>
					<WebsiteIcon style={styles.domainLogo} title={title} url={url} />
					<Text style={styles.messageFromLabel}>
						{strings('signature_request.message_from')} {title}
					</Text>
				</View>
				<ScrollView style={styles.scrollView}>{renderMessage()}</ScrollView>
			</View>
		);
	}
}
