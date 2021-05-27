import React from 'react';
import Approval from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { ROPSTEN } from '../../../constants/network';

const mockStore = configureMockStore();
const navigation = { state: { params: { address: '0x1' } } };
// noop
navigation.setParams = params => ({ ...params });

describe('Approval', () => {
	it('should render correctly', () => {
		const initialState = {
			settings: {
				showCustomNonce: false
			},
			transaction: {
				value: '',
				data: '',
				from: '0x1',
				gas: '',
				gasPrice: '',
				to: '0x2',
				selectedAsset: { symbol: 'ETH' },
				assetType: undefined
			},
			engine: {
				backgroundState: {
					TransactionController: {
						transactions: []
					},
					AddressBookController: {
						addressBook: {}
					},
					NetworkController: {
						provider: {
							type: ROPSTEN
						}
					}
				}
			}
		};

		const wrapper = shallow(<Approval navigation={navigation} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
