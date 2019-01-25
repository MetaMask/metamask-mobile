import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContracts from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('CollectibleContracts', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AssetsController: {
						allCollectibleContracts: [
							{
								name: 'name',
								logo: 'logo',
								address: '0x0',
								symbol: 'NM',
								description: 'description',
								total_supply: 10
							}
						]
					}
				}
			}
		};

		const wrapper = shallow(
			<CollectibleContracts
				navigation={{ state: { params: { address: '0x1' } } }}
				collectibles={[
					{
						address: '0x0',
						tokenId: 10,
						name: 'name',
						image: 'image'
					}
				]}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
