/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { SafeAreaView, ScrollView } from 'react-native';

import { storiesOf } from '@storybook/react-native';

// import { action } from '@storybook/addon-actions';
import { boolean } from '@storybook/addon-knobs';

// import AmountInput from './AmountInput';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import ScreenRegion from './ScreenRegion';

storiesOf('FiatOnRamp / ScreenRegion', module)
	.addDecorator((getStory) => getStory())
	.add('Default', () => {
		// const scrollable = boolean('Scrollable', false);
		const showTitle = boolean('Show title', true);
		const showDescription = boolean('Show description', true);
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);

		return (
			// eslint-disable-next-line react-native/no-inline-styles
			<SafeAreaView style={{ flex: 1 }}>
				<ScreenRegion>
					{showHeader && (
						<ScreenRegion.Header
							title={showTitle && 'Payment Method'}
							description={
								showDescription &&
								'Text here about how certain payment methods will be available depending on your region'
							}
						/>
					)}

					<ScreenRegion.Body>
						<ScreenRegion.Content>
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
						</ScreenRegion.Content>
					</ScreenRegion.Body>

					{showFooter && (
						<ScreenRegion.Footer>
							<ScreenRegion.Content>
								<StyledButton type={'confirm'} style={{ width: 200 }}>
									Get Started
								</StyledButton>
							</ScreenRegion.Content>
						</ScreenRegion.Footer>
					)}
				</ScreenRegion>
			</SafeAreaView>
		);
	})
	.add('Scrollable Body', () => {
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);

		return (
			// eslint-disable-next-line react-native/no-inline-styles
			<SafeAreaView style={{ flex: 1 }}>
				<ScreenRegion>
					{showHeader && (
						<ScreenRegion.Header
							title={'Payment Method'}
							description={
								'Text here about how certain payment methods will be available depending on your region'
							}
						/>
					)}

					<ScreenRegion.Body>
						<ScrollView>
							<ScreenRegion.Content>
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
							</ScreenRegion.Content>
						</ScrollView>
					</ScreenRegion.Body>

					{showFooter && (
						<ScreenRegion.Footer>
							<ScreenRegion.Content>
								<StyledButton type={'confirm'} style={{ width: 200 }}>
									Get Started
								</StyledButton>
							</ScreenRegion.Content>
						</ScreenRegion.Footer>
					)}
				</ScreenRegion>
			</SafeAreaView>
		);
	})
	.add('Scrollable Screen', () => {
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);
		return (
			// eslint-disable-next-line react-native/no-inline-styles
			<SafeAreaView style={{ flex: 1 }}>
				<ScreenRegion scrollable>
					{showHeader && (
						<ScreenRegion.Header
							title={'Payment Method'}
							description={
								'Text here about how certain payment methods will be available depending on your region'
							}
						/>
					)}

					<ScreenRegion.Body>
						<ScreenRegion.Content>
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
						</ScreenRegion.Content>
					</ScreenRegion.Body>

					{showFooter && (
						<ScreenRegion.Footer>
							<ScreenRegion.Content>
								<StyledButton type={'confirm'} style={{ width: 200 }}>
									Get Started
								</StyledButton>
							</ScreenRegion.Content>
						</ScreenRegion.Footer>
					)}
				</ScreenRegion>
			</SafeAreaView>
		);
	})
	.add('Custom Header', () => {
		const showTitle = boolean('Show title', true);
		const showDescription = boolean('Show description', true);
		const showHeader = boolean('Show header', true);
		const showFooter = boolean('Show footer', true);
		return (
			// eslint-disable-next-line react-native/no-inline-styles
			<SafeAreaView style={{ flex: 1 }}>
				<ScreenRegion>
					{showHeader && (
						<ScreenRegion.Header
							title={showTitle && 'Payment Method'}
							description={
								showDescription &&
								'Text here about how certain payment methods will be available depending on your region'
							}
						>
							<Text />
							<StyledButton type={'confirm'} style={{ width: 200 }}>
								Before you start
							</StyledButton>
						</ScreenRegion.Header>
					)}

					<ScreenRegion.Body>
						<ScrollView>
							<ScreenRegion.Content>
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
							</ScreenRegion.Content>
						</ScrollView>
					</ScreenRegion.Body>

					{showFooter && (
						<ScreenRegion.Footer>
							<ScreenRegion.Content>
								<StyledButton type={'confirm'} style={{ width: 200 }}>
									Get Started
								</StyledButton>
							</ScreenRegion.Content>
						</ScreenRegion.Footer>
					)}
				</ScreenRegion>
			</SafeAreaView>
		);
	});
