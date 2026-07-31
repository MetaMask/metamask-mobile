import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import GeneralSettings from '../../../app/components/Views/Settings/GeneralSettings';
import AdvancedSettings from '../../../app/components/Views/Settings/AdvancedSettings';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStateSettings } from '../presets/settings';

interface SettingsRendererOptions {
  overrides?: DeepPartial<RootState>;
}

const buildSettingsState = ({ overrides }: SettingsRendererOptions = {}) => {
  const builder = initialStateSettings();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
};

export const renderGeneralSettings = (options: SettingsRendererOptions = {}) =>
  renderComponentViewScreen(
    GeneralSettings as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.GENERAL_SETTINGS },
    { state: buildSettingsState(options) },
  );

export const renderAdvancedSettings = (options: SettingsRendererOptions = {}) =>
  renderScreenWithRoutes(
    AdvancedSettings as unknown as React.ComponentType,
    { name: Routes.SETTINGS.ADVANCED_SETTINGS },
    [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
    { state: buildSettingsState(options) },
  );
