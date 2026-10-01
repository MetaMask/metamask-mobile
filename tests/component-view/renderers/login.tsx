import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderComponentViewScreen } from '../render';
import Login from '../../../app/components/Views/Login';
import { initialStateLogin } from '../presets/login';

interface RenderLoginOptions {
  overrides?: DeepPartial<RootState>;
  remoteFeatureFlags?: Record<string, unknown>;
  locked?: boolean;
}

export function renderLoginView(options: RenderLoginOptions = {}) {
  const builder = initialStateLogin();
  if (options.remoteFeatureFlags) {
    builder.withRemoteFeatureFlags(options.remoteFeatureFlags);
  }
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }

  return renderComponentViewScreen(
    Login as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.LOGIN },
    { state: builder.build() },
    {
      locked: options.locked ?? true,
      oauthLoginSuccess: false,
    },
  );
}
