import '../mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
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

export const SETTINGS_LAUNCHER_LABEL = 'Open settings';

const buildSettingsState = ({ overrides }: SettingsRendererOptions = {}) => {
  const builder = initialStateSettings();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
};

const createSettingsLauncher = (routeName: string) => {
  const SettingsLauncher = ({
    navigation,
  }: {
    navigation: NavigationProp<ParamListBase>;
  }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate(routeName)}
    >
      <Text>{SETTINGS_LAUNCHER_LABEL}</Text>
    </Pressable>
  );

  return SettingsLauncher;
};

const renderSettingsWithBackRoute = (
  Component: React.ComponentType,
  routeName: string,
  options: SettingsRendererOptions = {},
) =>
  renderScreenWithRoutes(
    createSettingsLauncher(routeName) as unknown as React.ComponentType,
    { name: `${routeName}-launcher` },
    [{ name: routeName, Component }],
    { state: buildSettingsState(options) },
  );

export const renderGeneralSettings = (options: SettingsRendererOptions = {}) =>
  renderComponentViewScreen(
    GeneralSettings as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.GENERAL_SETTINGS },
    { state: buildSettingsState(options) },
  );

export const renderGeneralSettingsWithBackRoute = (
  options: SettingsRendererOptions = {},
) =>
  renderSettingsWithBackRoute(
    GeneralSettings as unknown as React.ComponentType,
    Routes.ONBOARDING.GENERAL_SETTINGS,
    options,
  );

export const renderAdvancedSettings = (options: SettingsRendererOptions = {}) =>
  renderScreenWithRoutes(
    AdvancedSettings as unknown as React.ComponentType,
    { name: Routes.SETTINGS.ADVANCED_SETTINGS },
    [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
    { state: buildSettingsState(options) },
  );

export const renderAdvancedSettingsWithBackRoute = (
  options: SettingsRendererOptions = {},
) =>
  renderSettingsWithBackRoute(
    AdvancedSettings as unknown as React.ComponentType,
    Routes.SETTINGS.ADVANCED_SETTINGS,
    options,
  );
