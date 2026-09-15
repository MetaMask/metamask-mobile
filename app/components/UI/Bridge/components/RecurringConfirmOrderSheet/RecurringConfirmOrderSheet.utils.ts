import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('bridge-recurring-auto-upgrade');

export async function submitRecurringOrder(): Promise<void> {
  log('Recurring order backend submission placeholder');
}

export function showRecurringAutoUpgradeError(error: unknown): void {
  log('Recurring account upgrade error placeholder', error);
}
