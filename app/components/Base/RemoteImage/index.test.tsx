import React from 'react';
import { shallow } from 'enzyme';
import RemoteImage from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	engine: {
		backgroundState: {
			PreferencesController: { ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/' },
		},
	},
};
const store = mockStore(initialState);

describe('RemoteImage', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<RemoteImage
					source={{
						uri: `https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg`,
					}}
				/>
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
