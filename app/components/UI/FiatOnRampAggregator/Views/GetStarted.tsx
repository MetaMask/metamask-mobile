import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import TextJS from '../../../Base/Text';
import ListItemJS from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';
import ScreenLayout from '../components/ScreenLayout';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useFiatOnRampSDK } from '../sdk';

// TODO: Convert into typescript and correctly type optionals
const Text = TextJS as any;
const ListItem = ListItemJS as any;

const styles = StyleSheet.create({
	listItem: {
		marginBottom: 20,
	},
	title: {
		fontSize: 14,
	},
	description: {
		marginVertical: 5,
	},
	icon: {
		alignSelf: 'flex-start',
	},
});

const whatToExpectList = [
	{
		id: 1,
		title: strings('fiat_on_ramp_aggregator.onboarding.save_time_money'),
		description: strings('fiat_on_ramp_aggregator.onboarding.save_time_money_description'),
	},
	{
		id: 2,
		title: strings('fiat_on_ramp_aggregator.onboarding.full_control_at_your_hands'),
		description: strings('fiat_on_ramp_aggregator.onboarding.full_control_at_your_hands_description'),
	},
	{
		id: 3,
		title: strings('fiat_on_ramp_aggregator.onboarding.growing_collection_of_tokens'),
		description: strings('fiat_on_ramp_aggregator.onboarding.growing_collection_of_tokens_description'),
	},
];

const GetStarted: React.FC = () => {
	const navigation = useNavigation();
	const { getStarted, setGetStarted } = useFiatOnRampSDK();

	const { colors } = useTheme();

	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Get Started', showBack: false }, colors));
	}, [navigation, colors]);

	const handleOnPress = useCallback(() => {
		navigation.navigate('Region');
		setGetStarted(true);
	}, [navigation, setGetStarted]);

	useEffect(() => {
		if (getStarted) {
			navigation.reset({
				index: 0,
				routes: [{ name: 'Region_hasStarted' }],
			});
		}
	}, [getStarted, navigation]);

	return (
		<ScreenLayout>
			<ScreenLayout.Header title="What to expect" />

			<ScreenLayout.Body>
				<ScreenLayout.Content>
					{whatToExpectList.map(({ id, title, description }) => (
						<ListItem.Content key={id} style={styles.listItem}>
							<ListItem.Icon style={styles.icon}>
								<FontAwesome name="circle" size={32} color={colors.icon.default} />
							</ListItem.Icon>
							<ListItem.Body>
								<ListItem.Title bold style={styles.title}>
									{title}
								</ListItem.Title>
								<Text style={styles.description}>{description}</Text>
							</ListItem.Body>
						</ListItem.Content>
					))}
				</ScreenLayout.Content>
			</ScreenLayout.Body>

			<ScreenLayout.Footer>
				<ScreenLayout.Content>
					<StyledButton type={'confirm'} onPress={handleOnPress}>
						{strings('fiat_on_ramp_aggregator.onboarding.get_started')}
					</StyledButton>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

export default GetStarted;
