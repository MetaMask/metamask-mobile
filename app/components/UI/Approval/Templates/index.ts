import { omit, pick } from 'lodash';
import approvalResult from './ApprovalResult';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { Actions } from '../Confirmation';
import { Colors } from 'app/util/theme/models';
import { ApprovalRequest } from '@metamask/approval-controller';

const APPROVAL_TEMPLATES: { [key: string]: any } = {
  [ApprovalTypes.RESULT_SUCCESS]: approvalResult,
  [ApprovalTypes.RESULT_ERROR]: approvalResult,
};

export const TEMPLATED_CONFIRMATION_APPROVAL_TYPES =
  Object.keys(APPROVAL_TEMPLATES);

const ALLOWED_TEMPLATE_KEYS: string[] = [
  'cancelText',
  'content',
  'onCancel',
  'onSubmit',
  'onConfirm',
  'networkDisplay',
  'submitText',
  'loadingText',
];

export async function getTemplateAlerts(
  pendingApproval: ApprovalRequest<any>,
  state: Record<string, unknown>,
) {
  const fn = APPROVAL_TEMPLATES[pendingApproval.type]?.getAlerts;
  const results = fn ? await fn(pendingApproval, state) : [];
  if (!Array.isArray(results)) {
    throw new Error(`Template alerts must be an array, received: ${results}`);
  }
  if (results.some((result) => result?.id === undefined)) {
    throw new Error(
      `Template alert entries must be objects with an id key. Received: ${results}`,
    );
  }
  return results;
}

async function emptyState() {
  return {};
}

export async function getTemplateState(pendingApproval: ApprovalRequest<any>) {
  const fn = APPROVAL_TEMPLATES[pendingApproval.type]?.getState ?? emptyState;
  const result = await fn(pendingApproval);
  if (typeof result !== 'object' || Array.isArray(result)) {
    throw new Error(`Template state must be an object, received: ${result}`);
  } else if (result === null || result === undefined) {
    return {};
  }
  return result;
}

export function getTemplateValues(
  pendingApproval: ApprovalRequest<any>,
  stringFn: (key: string) => string,
  actions: Actions,
  colors: Colors,
) {
  const fn = APPROVAL_TEMPLATES[pendingApproval.type]?.getValues;
  if (!fn) {
    throw new Error(
      `MESSAGE_TYPE: '${pendingApproval.type}' is not specified in approval templates`,
    );
  }

  const values = fn(pendingApproval, stringFn, actions, colors);
  const extraneousKeys = omit(values, ALLOWED_TEMPLATE_KEYS);
  const safeValues = pick(values, ALLOWED_TEMPLATE_KEYS);
  if (Object.keys(extraneousKeys).length > 0) {
    throw new Error(
      `Received extraneous keys from ${
        pendingApproval.type
      }.getValues. These keys are not passed to the confirmation page: ${Object.keys(
        extraneousKeys,
      )}`,
    );
  }
  return safeValues;
}
