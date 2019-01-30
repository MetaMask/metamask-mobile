import React from 'react';
import { shallow } from 'enzyme';
import Collectible from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Collectible', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AssetsController: {
						collectibles: [{ address: '0x0', name: 'collectible', tokenId: 0, image: 'image' }]
					}
				}
			},
			modals: {
				collectibleContractModalVisible: false
			}
		};

		const wrapper = shallow(<Collectible navigation={{ state: { params: { address: '0x1' } } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
