import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import TextJS from '../../../Base/Text';
import ListItemJS from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';
import ScreenRegion from '../components/ScreenRegion';
import { strings } from '../../../../../locales/i18n';
import { colors } from '../../../../styles/common';

const Text = TextJS as any;
const ListItem = ListItemJS as any;

const styles = StyleSheet.create({
	button: {
		width: 200,
	},
	listItem: {
		marginBottom: 20,
	},
	title: {
		fontSize: 14,
	},
	description: {
		fontSize: 12,
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

interface IProps {
	navigation: any;
}

interface IStaticComponents {
	navigationOptions: () => void;
}

const GetStarted: React.FC<IProps> & IStaticComponents = ({ navigation }: IProps) => {
	const handleOnPress = useCallback(() => {
		navigation.navigate('PaymentMethod');
	}, [navigation]);

	return (
		<ScreenRegion>
			<ScreenRegion.Header title="What to expect" />

			<ScreenRegion.Body>
				<ScreenRegion.Content>
					{whatToExpectList.map(({ id, title, description }) => (
						<ListItem.Content key={id} style={styles.listItem}>
							<ListItem.Icon style={styles.icon}>
								<FontAwesome name="circle" size={32} color={colors.grey100} />
							</ListItem.Icon>
							<ListItem.Body>
								<ListItem.Title bold style={styles.title}>
									{title}
								</ListItem.Title>
								<Text style={styles.description}>{description}</Text>
							</ListItem.Body>
						</ListItem.Content>
					))}
				</ScreenRegion.Content>
			</ScreenRegion.Body>

			<ScreenRegion.Footer>
				<ScreenRegion.Content>
					<StyledButton type={'confirm'} onPress={handleOnPress} style={styles.button}>
						{strings('fiat_on_ramp_aggregator.onboarding.get_started')}
					</StyledButton>
				</ScreenRegion.Content>
			</ScreenRegion.Footer>
		</ScreenRegion>
	);
};

GetStarted.navigationOptions = () => ({
	headerLeft: () => null,
	title: strings('fiat_on_ramp_aggregator.onboarding.buy_crypto_token'),
});

GetStarted.propTypes = {
	navigation: PropTypes.object,
};

export default GetStarted;
