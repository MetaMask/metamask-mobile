import React from 'react';
import Approval from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('Approval', () => {
	it('should render correctly', () => {
		const initialState = {
			transaction: {
				value: '',
				data: '',
				from: '0x1',
				gas: '',
				gasPrice: '',
				to: '0x2',
				selectedAsset: undefined,
				assetType: undefined
			},
			engine: {
				backgroundState: {
					TransactionController: {
						transactions: []
					}
				}
			}
		};

		const wrapper = shallow(<Approval />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
