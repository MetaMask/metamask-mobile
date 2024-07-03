// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import ModalConfirmation from './ModalConfirmation';
import {
  MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
  MODAL_CONFIRMATION_DANGER_BUTTON_ID,
} from './ModalConfirmation.constants';

describe('ModalConfirmation', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ModalConfirmation
        route={{
          params: {
            onConfirm: () => null,
            title: 'Title!',
            description: 'Description.',
          },
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should show normal variant button', () => {
    render(
      <ModalConfirmation
        route={{
          params: {
            onConfirm: () => null,
            title: 'Title!',
            description: 'Description.',
          },
        }}
      />,
    );
    const buttonComponent = screen.getByTestId(
      MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
    );
    expect(buttonComponent).toBeTruthy();
  });

  it('should show danger variant button', () => {
    render(
      <ModalConfirmation
        route={{
          params: {
            onConfirm: () => null,
            isDanger: true,
            title: 'Title!',
            description: 'Description.',
          },
        }}
      />,
    );
    const buttonComponent = screen.getByTestId(
      MODAL_CONFIRMATION_DANGER_BUTTON_ID,
    );
    expect(buttonComponent).toBeTruthy();
  });
});
