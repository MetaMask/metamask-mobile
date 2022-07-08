import React from 'react';
import { shallow } from 'enzyme';
import ConfirmationModal from './ConfirmationModal';
import { ConfirmationModalVariant } from './ConfirmationModal.types';
import {
  CONFIRMATION_MODAL_DANGER_BUTTON_ID,
  CONFIRMATION_MODAL_NORMAL_BUTTON_ID,
} from '../../../constants/test-ids';

describe('ConfirmationModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ConfirmationModal
        route={{
          params: {
            onConfirm: () => null,
            variant: ConfirmationModalVariant.Normal,
            title: 'Title!',
            description: 'Description.',
          },
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should show normal variant button', () => {
    const wrapper = shallow(
      <ConfirmationModal
        route={{
          params: {
            onConfirm: () => null,
            variant: ConfirmationModalVariant.Normal,
            title: 'Title!',
            description: 'Description.',
          },
        }}
      />,
    );
    const buttonComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CONFIRMATION_MODAL_NORMAL_BUTTON_ID,
    );
    expect(buttonComponent.exists()).toBe(true);
  });
  it('should show danger variant button', () => {
    const wrapper = shallow(
      <ConfirmationModal
        route={{
          params: {
            onConfirm: () => null,
            variant: ConfirmationModalVariant.Danger,
            title: 'Title!',
            description: 'Description.',
          },
        }}
      />,
    );
    const buttonComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CONFIRMATION_MODAL_DANGER_BUTTON_ID,
    );
    expect(buttonComponent.exists()).toBe(true);
  });
});
