import { useRoute } from '@react-navigation/native';
import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { baseStyles } from '../../../../styles/common';

const CheckoutWebView = () => {
	const { params } = useRoute();
	const uri = params?.buyURL;

	if (params?.buyURL) {
		return (
			<View style={baseStyles.flexGrow}>
				<WebView source={{ uri }} allowInlineMediaPlayback mediaPlaybackRequiresUserAction={false} />
			</View>
		);
	}
};

CheckoutWebView.navigationOptions = ({ route }) => ({
	title: route?.params?.providerName,
});

export default CheckoutWebView;
