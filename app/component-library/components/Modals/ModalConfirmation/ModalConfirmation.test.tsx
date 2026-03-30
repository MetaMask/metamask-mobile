// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import ModalConfirmation from './ModalConfirmation';
import {
  MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
  MODAL_CONFIRMATION_DANGER_BUTTON_ID,
} from './ModalConfirmation.constants';

let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    key: '1',
    name: 'params',
    params: mockRouteParams,
  }),
}));

describe('ModalConfirmation', () => {
  beforeEach(() => {
    mockRouteParams = {
      onConfirm: () => null,
      title: 'Title!',
      description: 'Description.',
    };
  });

  it('should render correctly', () => {
    const wrapper = shallow(<ModalConfirmation />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should show normal variant button', () => {
    const wrapper = shallow(<ModalConfirmation />);
    const buttonComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
    );
    expect(buttonComponent.exists()).toBe(true);
  });
  it('should show danger variant button', () => {
    mockRouteParams = {
      onConfirm: () => null,
      isDanger: true,
      title: 'Title!',
      description: 'Description.',
    };
    const wrapper = shallow(<ModalConfirmation />);
    const buttonComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MODAL_CONFIRMATION_DANGER_BUTTON_ID,
    );
    expect(buttonComponent.exists()).toBe(true);
  });
});
