import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import BackupAndSyncSettings from '../../../app/components/Views/Settings/Identity/BackupAndSyncSettings';
import Contacts from '../../../app/components/Views/Settings/Contacts';
import ContactForm from '../../../app/components/Views/Settings/Contacts/ContactForm';
import { initialStateIdentity } from '../presets/identity';

interface IdentityRendererOptions {
  overrides?: DeepPartial<RootState>;
  stateOptions?: Parameters<typeof initialStateIdentity>[0];
}

export function buildIdentityState(options: IdentityRendererOptions = {}) {
  const { stateOptions, overrides } = options;
  const builder = initialStateIdentity(stateOptions);
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
}

export function renderBackupAndSyncSettings(
  options: IdentityRendererOptions = {},
) {
  return renderComponentViewScreen(
    BackupAndSyncSettings as unknown as React.ComponentType,
    { name: Routes.SETTINGS.BACKUP_AND_SYNC },
    { state: buildIdentityState(options) },
  );
}

export function renderContactsWithRoutes(
  options: IdentityRendererOptions = {},
) {
  return renderScreenWithRoutes(
    Contacts as unknown as React.ComponentType,
    { name: Routes.SETTINGS.CONTACTS },
    [
      {
        name: Routes.SETTINGS.CONTACT_FORM,
        Component: ContactForm as unknown as React.ComponentType<unknown>,
      },
    ],
    { state: buildIdentityState(options) },
  );
}

export function renderContactForm(options: IdentityRendererOptions = {}) {
  return renderComponentViewScreen(
    ContactForm as unknown as React.ComponentType,
    { name: Routes.SETTINGS.CONTACT_FORM },
    { state: buildIdentityState(options) },
    { mode: 'add' },
  );
}
