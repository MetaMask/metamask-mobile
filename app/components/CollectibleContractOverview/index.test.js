import React from 'react';
import CollectibleContractOverview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('CollectibleContractOverview', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AssetsController: {
						collectibles: []
					}
				}
			}
		};

		const wrapper = shallow(
			<CollectibleContractOverview
				collectibleContract={{
					name: 'name',
					symbol: 'symbol',
					description: 'description',
					address: '0x123',
					totalSupply: 1
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
