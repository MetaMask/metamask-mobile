import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { baseStyles } from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';

const CheckoutWebView = () => {
	const navigation = useNavigation();
	const { params } = useRoute();
	const { colors } = useTheme();
	const uri = params?.buyURL;
	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Checkout' }, colors));
	}, [navigation, colors]);

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
