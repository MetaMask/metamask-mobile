import React from 'react';
import { shallow } from 'enzyme';
import WatchAssetRequest from './';
import configureMockStore from 'redux-mock-store';
import { BN } from 'ethereumjs-util';

const mockStore = configureMockStore();

describe('WatchAssetRequest', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					TokenBalancesController: {
						contractBalances: { '0x2': new BN(0) }
					}
				}
			}
		};

		const wrapper = shallow(
			<WatchAssetRequest suggestedAssetMeta={{ asset: { address: '0x2', symbol: 'TKN', decimals: 0 } }} />,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
