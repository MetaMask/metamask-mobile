import React from 'react';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import AddAsset from './';

const mockStore = configureMockStore();

describe('AddAsset', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					NetworkController: {
						provider: {
							chainId: '1'
						}
					}
				}
			}
		};

		const wrapper = shallow(<AddAsset route={{ params: { assetType: 'token' } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
