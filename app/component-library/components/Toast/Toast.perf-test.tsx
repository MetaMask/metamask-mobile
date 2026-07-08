import React, { createRef } from 'react';
import { act } from '@testing-library/react-native';
import { measureRenders } from 'reassure';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Toast from './Toast';
import {
  ButtonIconVariant,
  ToastOptions,
  ToastRef,
  ToastVariants,
} from './Toast.types';
import { ToastSelectorsIDs } from './ToastModal.testIds';
import { TEST_NETWORK_IMAGE_SOURCE } from './Toast.constants';
import { IconName } from '../Icons/Icon';

const toastRef = createRef<ToastRef>();

function ToastPerfHost() {
  return <Toast ref={toastRef} />;
}

const ProvidersWrapper: React.ComponentType<{
  children: React.ReactElement;
}> = ({ children }) => <SafeAreaProvider>{children}</SafeAreaProvider>;

const PLAIN_TOAST_OPTIONS: ToastOptions = {
  variant: ToastVariants.Plain,
  labelOptions: [{ label: 'Transaction confirmed.' }],
  hasNoTimeout: true,
};

const NETWORK_TOAST_OPTIONS: ToastOptions = {
  variant: ToastVariants.Network,
  labelOptions: [
    { label: 'Paying gas with ', isBold: false },
    { label: 'ETH.', isBold: true },
  ],
  networkImageSource: TEST_NETWORK_IMAGE_SOURCE,
  hasNoTimeout: true,
};

const ICON_TOAST_WITH_CLOSE_OPTIONS: ToastOptions = {
  variant: ToastVariants.Icon,
  labelOptions: [{ label: 'Order confirmed', isBold: true }],
  iconName: IconName.Check,
  hasNoTimeout: true,
  closeButtonOptions: {
    variant: ButtonIconVariant.Icon,
    iconName: IconName.Close,
    onPress: () => {
      toastRef.current?.closeToast();
    },
  },
};

async function showToastAndWaitForContainer(
  screen: { findByTestId: (id: string) => Promise<unknown> },
  options: ToastOptions,
): Promise<void> {
  await act(async () => {
    toastRef.current?.showToast(options);
  });

  await screen.findByTestId(ToastSelectorsIDs.CONTAINER);
}

test('Toast idle mount performance', async () => {
  await measureRenders(<ToastPerfHost />, { wrapper: ProvidersWrapper });
});

test('Toast show plain variant performance', async () => {
  await measureRenders(<ToastPerfHost />, {
    wrapper: ProvidersWrapper,
    scenario: async (screen) => {
      await showToastAndWaitForContainer(screen, PLAIN_TOAST_OPTIONS);
    },
  });
});

test('Toast show network variant performance', async () => {
  await measureRenders(<ToastPerfHost />, {
    wrapper: ProvidersWrapper,
    scenario: async (screen) => {
      await showToastAndWaitForContainer(screen, NETWORK_TOAST_OPTIONS);
    },
  });
});

test('Toast show icon variant with close button performance', async () => {
  await measureRenders(<ToastPerfHost />, {
    wrapper: ProvidersWrapper,
    scenario: async (screen) => {
      await showToastAndWaitForContainer(screen, ICON_TOAST_WITH_CLOSE_OPTIONS);
    },
  });
});

test('Toast rapid successive showToast performance', async () => {
  await measureRenders(<ToastPerfHost />, {
    wrapper: ProvidersWrapper,
    scenario: async (screen) => {
      await act(async () => {
        toastRef.current?.showToast({
          variant: ToastVariants.Plain,
          labelOptions: [{ label: 'In progress' }],
          hasNoTimeout: true,
        });
        toastRef.current?.showToast({
          variant: ToastVariants.Plain,
          labelOptions: [{ label: 'Success' }],
          hasNoTimeout: true,
        });
      });

      await screen.findByText('Success');
    },
  });
});
