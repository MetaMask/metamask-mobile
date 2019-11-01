import React from 'react';
import { Text } from 'react-native';
import { shallow } from 'enzyme';
import ChooseInstaPayUserModal from './';

describe('ChooseInstaPayUserModal', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<ChooseInstaPayUserModal
				// eslint-disable-next-line react/jsx-no-bind
				onConfirmPress={() => true}
				modalVisible
				confirmText={'Confirm'}
				loading={false}
			>
				<Text>Please wait</Text>
			</ChooseInstaPayUserModal>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
