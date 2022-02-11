import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import ScreenLayout from './ScreenLayout';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
	content: {
		width: '100%',
	},
	header: {
		alignItems: 'stretch',
	},
});

storiesOf('FiatOnRamp / ScreenLayout', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		// const scrollable = boolean('Scrollable', false);
		const showTitle = boolean('Show title', true);
		const showDescription = boolean('Show description', true);
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);

		return (
			<SafeAreaView style={styles.wrapper}>
				<ScreenLayout>
					{showHeader && (
						<ScreenLayout.Header
							title={showTitle && 'Payment Method'}
							description={
								showDescription &&
								'Text here about how certain payment methods will be available depending on your region'
							}
						/>
					)}

					<ScreenLayout.Body>
						<ScreenLayout.Content>
							<Text>
								Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum
								has been the industrys standard dummy text ever since the 1500s, when an unknown printer
								took a galley of type and scrambled it to make a type specimen book. It has survived not
								only five centuries, but also the leap into electronic typesetting, remaining
								essentially unchanged. It was popularised in the 1960s with the release of Letraset
								sheets containing Lorem Ipsum passages, and more recently with desktop publishing
								software like Aldus PageMaker including versions of Lorem Ipsum.
							</Text>
							<Text />
							<Text>
								It is a long established fact that a reader will be distracted by the readable content
								of a page when looking at its layout. The point of using Lorem Ipsum is that it has a
								more-or-less normal distribution of letters, as opposed to using Content here, content
								here, making it look like readable English. Many desktop publishing packages and web
								page editors now use Lorem Ipsum as their default model text, and a search for lorem
								ipsum will uncover many web sites still in their infancy. Various versions have evolved
								over the years, sometimes by accident, sometimes on purpose (injected humour and the
								like).
							</Text>
						</ScreenLayout.Content>
					</ScreenLayout.Body>

					{showFooter && (
						<ScreenLayout.Footer>
							<ScreenLayout.Content style={styles.content}>
								<StyledButton type={'confirm'}>Get Started</StyledButton>
							</ScreenLayout.Content>
						</ScreenLayout.Footer>
					)}
				</ScreenLayout>
			</SafeAreaView>
		);
	})
	.add('Scrollable Body', () => {
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);

		return (
			<SafeAreaView style={styles.wrapper}>
				<ScreenLayout>
					{showHeader && (
						<ScreenLayout.Header
							title={'Payment Method'}
							description={
								'Text here about how certain payment methods will be available depending on your region'
							}
						/>
					)}

					<ScreenLayout.Body>
						<ScrollView>
							<ScreenLayout.Content>
								<Text>
									Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
									Ipsum has been the industrys standard dummy text ever since the 1500s, when an
									unknown printer took a galley of type and scrambled it to make a type specimen book.
									It has survived not only five centuries, but also the leap into electronic
									typesetting, remaining essentially unchanged. It was popularised in the 1960s with
									the release of Letraset sheets containing Lorem Ipsum passages, and more recently
									with desktop publishing software like Aldus PageMaker including versions of Lorem
									Ipsum.
								</Text>
								<Text />
								<Text>
									It is a long established fact that a reader will be distracted by the readable
									content of a page when looking at its layout. The point of using Lorem Ipsum is that
									it has a more-or-less normal distribution of letters, as opposed to using Content
									here, content here, making it look like readable English. Many desktop publishing
									packages and web page editors now use Lorem Ipsum as their default model text, and a
									search for lorem ipsum will uncover many web sites still in their infancy. Various
									versions have evolved over the years, sometimes by accident, sometimes on purpose
									(injected humour and the like).
								</Text>
								<Text />
								<Text>
									Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
									Ipsum has been the industrys standard dummy text ever since the 1500s, when an
									unknown printer took a galley of type and scrambled it to make a type specimen book.
									It has survived not only five centuries, but also the leap into electronic
									typesetting, remaining essentially unchanged. It was popularised in the 1960s with
									the release of Letraset sheets containing Lorem Ipsum passages, and more recently
									with desktop publishing software like Aldus PageMaker including versions of Lorem
									Ipsum.
								</Text>
								<Text />
								<Text>
									It is a long established fact that a reader will be distracted by the readable
									content of a page when looking at its layout. The point of using Lorem Ipsum is that
									it has a more-or-less normal distribution of letters, as opposed to using Content
									here, content here, making it look like readable English. Many desktop publishing
									packages and web page editors now use Lorem Ipsum as their default model text, and a
									search for lorem ipsum will uncover many web sites still in their infancy. Various
									versions have evolved over the years, sometimes by accident, sometimes on purpose
									(injected humour and the like).
								</Text>
							</ScreenLayout.Content>
						</ScrollView>
					</ScreenLayout.Body>

					{showFooter && (
						<ScreenLayout.Footer>
							<ScreenLayout.Content style={styles.content}>
								<StyledButton type={'confirm'}>Get Started</StyledButton>
							</ScreenLayout.Content>
						</ScreenLayout.Footer>
					)}
				</ScreenLayout>
			</SafeAreaView>
		);
	})
	.add('Scrollable Screen', () => {
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);
		return (
			<SafeAreaView style={styles.wrapper}>
				<ScreenLayout scrollable>
					{showHeader && (
						<ScreenLayout.Header
							title={'Payment Method'}
							description={
								'Text here about how certain payment methods will be available depending on your region'
							}
						/>
					)}

					<ScreenLayout.Body>
						<ScreenLayout.Content>
							<Text>
								Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum
								has been the industrys standard dummy text ever since the 1500s, when an unknown printer
								took a galley of type and scrambled it to make a type specimen book. It has survived not
								only five centuries, but also the leap into electronic typesetting, remaining
								essentially unchanged. It was popularised in the 1960s with the release of Letraset
								sheets containing Lorem Ipsum passages, and more recently with desktop publishing
								software like Aldus PageMaker including versions of Lorem Ipsum.
							</Text>
							<Text />
							<Text>
								It is a long established fact that a reader will be distracted by the readable content
								of a page when looking at its layout. The point of using Lorem Ipsum is that it has a
								more-or-less normal distribution of letters, as opposed to using Content here, content
								here, making it look like readable English. Many desktop publishing packages and web
								page editors now use Lorem Ipsum as their default model text, and a search for lorem
								ipsum will uncover many web sites still in their infancy. Various versions have evolved
								over the years, sometimes by accident, sometimes on purpose (injected humour and the
								like).
							</Text>
							<Text />
							<Text>
								Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum
								has been the industrys standard dummy text ever since the 1500s, when an unknown printer
								took a galley of type and scrambled it to make a type specimen book. It has survived not
								only five centuries, but also the leap into electronic typesetting, remaining
								essentially unchanged. It was popularised in the 1960s with the release of Letraset
								sheets containing Lorem Ipsum passages, and more recently with desktop publishing
								software like Aldus PageMaker including versions of Lorem Ipsum.
							</Text>
							<Text />
							<Text>
								It is a long established fact that a reader will be distracted by the readable content
								of a page when looking at its layout. The point of using Lorem Ipsum is that it has a
								more-or-less normal distribution of letters, as opposed to using Content here, content
								here, making it look like readable English. Many desktop publishing packages and web
								page editors now use Lorem Ipsum as their default model text, and a search for lorem
								ipsum will uncover many web sites still in their infancy. Various versions have evolved
								over the years, sometimes by accident, sometimes on purpose (injected humour and the
								like).
							</Text>
						</ScreenLayout.Content>
					</ScreenLayout.Body>

					{showFooter && (
						<ScreenLayout.Footer>
							<ScreenLayout.Content style={styles.content}>
								<StyledButton type={'confirm'}>Get Started</StyledButton>
							</ScreenLayout.Content>
						</ScreenLayout.Footer>
					)}
				</ScreenLayout>
			</SafeAreaView>
		);
	})
	.add('Custom Header', () => {
		const showTitle = boolean('Show title', true);
		const showDescription = boolean('Show description', true);
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);
		return (
			<SafeAreaView style={styles.wrapper}>
				<ScreenLayout>
					{showHeader && (
						<ScreenLayout.Header
							title={showTitle && 'Payment Method'}
							description={
								showDescription &&
								'Text here about how certain payment methods will be available depending on your region'
							}
							style={styles.header}
						>
							<ScreenLayout.Content>
								<StyledButton type={'confirm'}>Before you start</StyledButton>
							</ScreenLayout.Content>
						</ScreenLayout.Header>
					)}

					<ScreenLayout.Body>
						<ScrollView>
							<ScreenLayout.Content>
								<Text>
									Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
									Ipsum has been the industrys standard dummy text ever since the 1500s, when an
									unknown printer took a galley of type and scrambled it to make a type specimen book.
									It has survived not only five centuries, but also the leap into electronic
									typesetting, remaining essentially unchanged. It was popularised in the 1960s with
									the release of Letraset sheets containing Lorem Ipsum passages, and more recently
									with desktop publishing software like Aldus PageMaker including versions of Lorem
									Ipsum.
								</Text>
								<Text />
								<Text>
									It is a long established fact that a reader will be distracted by the readable
									content of a page when looking at its layout. The point of using Lorem Ipsum is that
									it has a more-or-less normal distribution of letters, as opposed to using Content
									here, content here, making it look like readable English. Many desktop publishing
									packages and web page editors now use Lorem Ipsum as their default model text, and a
									search for lorem ipsum will uncover many web sites still in their infancy. Various
									versions have evolved over the years, sometimes by accident, sometimes on purpose
									(injected humour and the like).
								</Text>
								<Text />
								<Text>
									Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
									Ipsum has been the industrys standard dummy text ever since the 1500s, when an
									unknown printer took a galley of type and scrambled it to make a type specimen book.
									It has survived not only five centuries, but also the leap into electronic
									typesetting, remaining essentially unchanged. It was popularised in the 1960s with
									the release of Letraset sheets containing Lorem Ipsum passages, and more recently
									with desktop publishing software like Aldus PageMaker including versions of Lorem
									Ipsum.
								</Text>
							</ScreenLayout.Content>
						</ScrollView>
					</ScreenLayout.Body>

					{showFooter && (
						<ScreenLayout.Footer>
							<ScreenLayout.Content style={styles.content}>
								<StyledButton type={'confirm'}>Get Started</StyledButton>
							</ScreenLayout.Content>
						</ScreenLayout.Footer>
					)}
				</ScreenLayout>
			</SafeAreaView>
		);
	});
