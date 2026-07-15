import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PriceImpactFooter } from './PriceImpactFooter';
import { PriceImpactModalType } from './constants';
import { strings } from '../../../../../../locales/i18n';

const onConfirm = jest.fn();
const onCancel = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PriceImpactFooter', () => {
  describe('Info type', () => {
    it('renders the Got it button', () => {
      const { getByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Info}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      expect(getByText(strings('bridge.got_it'))).toBeTruthy();
    });

    it('does not render the Proceed button', () => {
      const { queryByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Info}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      expect(queryByText(strings('bridge.proceed'))).toBeNull();
    });

    it('does not render the Cancel button', () => {
      const { queryByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Info}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      expect(queryByText(strings('bridge.cancel'))).toBeNull();
    });

    it('calls onConfirm when Got it is pressed', () => {
      const { getByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Info}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      fireEvent.press(getByText(strings('bridge.got_it')));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('does not pass loading or disabled props to the Got it button', () => {
      // loading prop is not forwarded for the Info type layout — no isLoading/disabled
      // on the button. Rendering with loading=true should not affect the button state.
      const { getByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Info}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading
        />,
      );

      fireEvent.press(getByText(strings('bridge.got_it')));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Execution type', () => {
    it('renders the Proceed button', () => {
      const { getByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Execution}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      expect(getByText(strings('bridge.proceed'))).toBeTruthy();
    });

    it('renders the Cancel button', () => {
      const { getByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Execution}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      expect(getByText(strings('bridge.cancel'))).toBeTruthy();
    });

    it('does not render the Got it button', () => {
      const { queryByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Execution}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      expect(queryByText(strings('bridge.got_it'))).toBeNull();
    });

    it('calls onCancel when Proceed is pressed', () => {
      const { getByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Execution}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      fireEvent.press(getByText(strings('bridge.proceed')));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm when Cancel is pressed', () => {
      const { getByText } = render(
        <PriceImpactFooter
          type={PriceImpactModalType.Execution}
          onConfirm={onConfirm}
          onCancel={onCancel}
          loading={false}
        />,
      );

      fireEvent.press(getByText(strings('bridge.cancel')));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    describe('loading state', () => {
      it('disables the Proceed button while loading', () => {
        const { getAllByRole } = render(
          <PriceImpactFooter
            type={PriceImpactModalType.Execution}
            onConfirm={onConfirm}
            onCancel={onCancel}
            loading
          />,
        );

        // Execution layout renders Proceed first, Cancel second
        const [proceedButton] = getAllByRole('button');
        expect(proceedButton.props.accessibilityState?.disabled).toBe(true);
      });

      it('disables the Cancel button while loading', () => {
        const { getAllByRole } = render(
          <PriceImpactFooter
            type={PriceImpactModalType.Execution}
            onConfirm={onConfirm}
            onCancel={onCancel}
            loading
          />,
        );

        const [, cancelButton] = getAllByRole('button');
        expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
      });

      it('does not fire onCancel when Proceed is pressed while loading', () => {
        const { getByText } = render(
          <PriceImpactFooter
            type={PriceImpactModalType.Execution}
            onConfirm={onConfirm}
            onCancel={onCancel}
            loading
          />,
        );

        fireEvent.press(getByText(strings('bridge.proceed')));

        expect(onCancel).not.toHaveBeenCalled();
      });

      it('does not fire onConfirm when Cancel is pressed while loading', () => {
        const { getByText } = render(
          <PriceImpactFooter
            type={PriceImpactModalType.Execution}
            onConfirm={onConfirm}
            onCancel={onCancel}
            loading
          />,
        );

        fireEvent.press(getByText(strings('bridge.cancel')));

        expect(onConfirm).not.toHaveBeenCalled();
      });

      it('does not mark buttons as disabled when not loading', () => {
        const { getAllByRole } = render(
          <PriceImpactFooter
            type={PriceImpactModalType.Execution}
            onConfirm={onConfirm}
            onCancel={onCancel}
            loading={false}
          />,
        );

        const [proceedButton, cancelButton] = getAllByRole('button');

        // ButtonBase only adds `disabled: true` to accessibilityState when
        // disabled; the key is absent (undefined) when the button is enabled.
        expect(proceedButton.props.accessibilityState?.disabled).not.toBe(true);
        expect(cancelButton.props.accessibilityState?.disabled).not.toBe(true);
      });

      it('sets busy accessibilityState on the Proceed button but not on the Cancel button', () => {
        const { getAllByRole } = render(
          <PriceImpactFooter
            type={PriceImpactModalType.Execution}
            onConfirm={onConfirm}
            onCancel={onCancel}
            loading
          />,
        );

        const [proceedButton, cancelButton] = getAllByRole('button');

        // Proceed (onCancel) shows a loading spinner — accessibilityState.busy = true
        expect(proceedButton.props.accessibilityState?.busy).toBe(true);
        // Cancel (onConfirm) is disabled but has no loading spinner
        expect(cancelButton.props.accessibilityState?.busy).not.toBe(true);
      });
    });
  });
});
