import React from 'react';
import { StyleSheet, View, SafeAreaView, ScrollView, ViewStyle } from 'react-native';
import { colors } from '../../../../styles/common';
import TextJS from '../../../Base/Text';

const Text = TextJS as any;

interface Style {
	wrapper: ViewStyle;
	container: ViewStyle;
	content: ViewStyle;
	header: ViewStyle;
	body: ViewStyle;
	footer: ViewStyle;
}

const styles = StyleSheet.create<Style>({
	wrapper: {
		flex: 1,
	},
	container: {
		backgroundColor: colors.white,
		flex: 1,
	},
	content: {
		padding: 15,
	},
	header: {
		marginVertical: 16,
		alignItems: 'center',
	},
	body: {
		flex: 1,
	},
	footer: {
		marginVertical: 10,
		alignItems: 'center',
	},
});

interface IPropsScreenLayout {
	scrollable?: boolean;
	style?: ViewStyle;
}

interface IStaticComponents {
	Header: React.FC<IPropsHeader>;
	Body: React.FC<IPropsHeader>;
	Footer: React.FC<IPropsHeader>;
	Content: React.FC<IPropsHeader>;
}

interface IPropsHeader {
	title?: string;
	description?: string;
	bold?: boolean;
	children?: React.ReactNode;
	style?: ViewStyle;
}

interface IPropsBody {
	style?: ViewStyle;
}

interface IPropsFooter {
	style?: ViewStyle;
}

interface IPropsContent {
	style?: ViewStyle;
}

const ScreenLayout: React.FC<IPropsScreenLayout> & IStaticComponents = ({
	style,
	scrollable,
	...props
}: IPropsScreenLayout) => {
	const Component = scrollable ? ScrollView : View;
	return (
		<SafeAreaView style={styles.wrapper}>
			<Component style={[styles.container, style]} {...props} />
		</SafeAreaView>
	);
};

const Header: React.FC<IPropsHeader> = ({ title, description, bold, children, style, ...props }: IPropsHeader) => (
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

const Body: React.FC<IPropsBody> = ({ style, ...props }: IPropsBody) => (
	<View style={[styles.body, style]} {...props} />
);

const Footer: React.FC<IPropsFooter> = ({ style, ...props }: IPropsFooter) => (
	<View style={[styles.footer, style]} {...props} />
);
const Content: React.FC<IPropsContent> = ({ style, ...props }: IPropsContent) => (
	<View style={[styles.content, style]} {...props} />
);

ScreenLayout.Header = Header;
ScreenLayout.Body = Body;
ScreenLayout.Footer = Footer;
ScreenLayout.Content = Content;

export default ScreenLayout;
