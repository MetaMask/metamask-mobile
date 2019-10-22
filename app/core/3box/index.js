import React, { PureComponent } from 'react';
import { WebView } from 'react-native-webview';

class Web3Box extends PureComponent {
	webview = React.createRef();

	render() {
		return (
			<WebView
				ref={this.webview}
				// eslint-disable-next-line react-native/no-inline-styles
				style={{ flex: 1 }}
				source={{
					html: `
				<html>
				<head>
				<title>3box</title>
				<script src="https://unpkg.com/3box/dist/3box.js"></script>
				</head>
				<body>
				<script>
				window.onload = async function(){
					const profile = await Box.getProfile('0xE46aBAf75cFbFF815c0b7FfeD6F02B0760eA27f1');
					document.write(JSON.stringify(profile));
				}
				</script>
				</body>
				</html>
				`
				}}
				javaScriptEnabled
				bounces={false}
				scrollEnabled={false}
			/>
		);
	}
}

export default Web3Box;
