import React from 'react';
import { WebView } from 'react-native';
import { baseStyles } from '../../styles/common';
const webPage = require('./web/index.html'); // eslint-disable-line import/no-commonjs

const AnimatedFox = () => (
	<WebView
		style={baseStyles.flexGrow}
		source={webPage}
		javaScriptEnabled
		domStorageEnabled
		bounces={false}
		scrollEnabled={false}
	/>
);

export default AnimatedFox;
