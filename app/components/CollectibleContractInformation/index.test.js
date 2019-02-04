import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContractInformation from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('CollectibleContractInformation', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					NetworkController: {
						provider: {
							type: 'mainnet'
						}
					}
				}
			}
		};

		const wrapper = shallow(
			<CollectibleContractInformation
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
