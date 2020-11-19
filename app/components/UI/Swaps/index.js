import React from 'react';
import { connect } from 'react-redux';
import Title from '../../Base/Title';

import Heading from '../FiatOrders/components/Heading';
import ScreenView from '../FiatOrders/components/ScreenView';
import { getSwapsAmountNavbar } from '../Navbar';

function SwapsAmountView() {
	// const navigation = useContext(NavigationContext);
	return (
		<ScreenView>
			<Heading>
				<Title bold center>
					Swaps here
				</Title>
			</Heading>
		</ScreenView>
	);
}

SwapsAmountView.navigationOptions = ({ navigation }) => getSwapsAmountNavbar(navigation);

export default connect()(SwapsAmountView);
