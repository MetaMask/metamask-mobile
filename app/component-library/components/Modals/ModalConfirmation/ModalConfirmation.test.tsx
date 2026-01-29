// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import ModalConfirmation from './ModalConfirmation';
import {
  MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
  MODAL_CONFIRMATION_DANGER_BUTTON_ID,
} from './ModalConfirmation.constants';

// Mock useRoute to provide route params
const mockUseRoute = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => mockUseRoute(),
}));

describe('ModalConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    mockUseRoute.mockReturnValue({
      params: {
        onConfirm: () => null,
        title: 'Title!',
        description: 'Description.',
      },
    });

    const wrapper = shallow(<ModalConfirmation />);
    expect(wrapper).toMatchSnapshot();
  });

  it('shows normal variant button', () => {
    mockUseRoute.mockReturnValue({
      params: {
        onConfirm: () => null,
        title: 'Title!',
        description: 'Description.',
      },
    });

    const wrapper = shallow(<ModalConfirmation />);
    const buttonComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
    );
    expect(buttonComponent.exists()).toBe(true);
  });

  it('shows danger variant button', () => {
    mockUseRoute.mockReturnValue({
      params: {
        onConfirm: () => null,
        isDanger: true,
        title: 'Title!',
        description: 'Description.',
      },
    });

    const wrapper = shallow(<ModalConfirmation />);
    const buttonComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MODAL_CONFIRMATION_DANGER_BUTTON_ID,
    );
    expect(buttonComponent.exists()).toBe(true);
  });
});
