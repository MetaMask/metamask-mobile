import paramsToObj from '@open-rpc/test-coverage/build/utils/params-to-obj';
import type {
  ContentDescriptorObject,
  JSONSchema,
  MethodObject,
  OpenrpcDocument,
} from '@open-rpc/meta-schema';
import type { Call, IOptions } from '@open-rpc/test-coverage/build/coverage';
import type Rule from '@open-rpc/test-coverage/build/rules/rule';
import Assertions from '../../../framework/Assertions.js';
import Gestures from '../../../framework/Gestures.js';
import Matchers from '../../../framework/Matchers.js';
import PlaywrightContextHelpers from '../../../framework/PlaywrightContextHelpers.js';
import { getDriver } from '../../../framework/PlaywrightUtilities.js';
import { sleep } from '../../../framework/Utilities.js';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import PermissionSummaryBottomSheet from '../../../page-objects/Browser/PermissionSummaryBottomSheet.js';
import SpamFilterModal from '../../../page-objects/Browser/SpamFilterModal.js';
import BrowserView from '../../../page-objects/Browser/BrowserView.js';
import AssetWatchBottomSheet from '../../../page-objects/Transactions/AssetWatchBottomSheet.js';
import {
  addToQueue,
  fireEthereumRequest,
  requestViaEthereumProvider,
} from './transport.js';

interface ConfirmationsRejectRuleOptions {
  pageUrl: string;
  only?: string[];
}

function getMethodResultSchema(method: MethodObject): JSONSchema {
  const result = method.result;
  if (!result || !('schema' in result)) {
    return {};
  }
  return result.schema;
}

/**
 * Lifecycle hooks enqueue on the shared transport queue so Cancel runs after
 * the ethereum.request is fired and before the response is polled.
 */
export default class ConfirmationsRejectRule implements Rule {
  private readonly pageUrl: string;

  private readonly only: string[] | undefined;

  private readonly allCapsCancel = ['wallet_watchAsset'];

  private readonly requiresEthAccountsPermission = [
    'personal_sign',
    'eth_signTypedData_v4',
    'eth_getEncryptionPublicKey',
    'wallet_revokePermissions',
  ];

  constructor(options: ConfirmationsRejectRuleOptions) {
    this.pageUrl = options.pageUrl;
    this.only = options.only;
  }

  getTitle(): string {
    return 'Confirmations Rejection Rule';
  }

  async beforeRequest(_options: IOptions, call: Call): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      void addToQueue({
        name: 'beforeRequest',
        resolve: () => resolve(),
        reject,
        task: async () => {
          if (this.requiresEthAccountsPermission.includes(call.methodName)) {
            // Fire permission request; Connect resolves it (Detox parity).
            await fireEthereumRequest(
              this.pageUrl,
              'wallet_requestPermissions',
              [{ eth_accounts: {} }],
            );

            await ConnectBottomSheet.tapConnectButton();
            await Assertions.checkIfNotVisible(
              PermissionSummaryBottomSheet.container,
            );
            await sleep(3000);

            try {
              await Assertions.checkIfVisible(SpamFilterModal.title);
              await SpamFilterModal.tapCloseButton();
              await Assertions.checkIfNotVisible(SpamFilterModal.title);
            } catch {
              // Spam modal is optional.
            }
          }

          // Mobile requires stringified typed data (same as Detox rule).
          if (call.methodName === 'eth_signTypedData_v4') {
            call.params[1] = JSON.stringify(call.params[1]);
          }
        },
      });
    });
  }

  getCalls(_openrpcDocument: OpenrpcDocument, method: MethodObject): Call[] {
    const calls: Call[] = [];
    const isMethodAllowed = this.only ? this.only.includes(method.name) : true;
    if (!isMethodAllowed) {
      return calls;
    }

    const examples = (
      method as MethodObject & {
        examples?: {
          name?: string;
          params?: { value?: unknown }[];
          result?: { value?: unknown };
        }[];
      }
    ).examples;

    if (examples?.length) {
      const example = examples[0];
      if (!example.result) {
        return calls;
      }
      const paramValues = (example.params ?? []).map((param) => param.value);
      const params =
        method.paramStructure === 'by-name'
          ? (paramsToObj(
              paramValues,
              method.params as ContentDescriptorObject[],
            ) as unknown[])
          : paramValues;
      calls.push({
        title: `${this.getTitle()} - with example ${example.name ?? method.name}`,
        methodName: method.name,
        params,
        url: '',
        resultSchema: getMethodResultSchema(method),
        expectedResult: example.result.value,
      });
      return calls;
    }

    calls.push({
      title: `${method.name} > confirmation rejection`,
      methodName: method.name,
      params: [],
      url: '',
      resultSchema: getMethodResultSchema(method),
    });
    return calls;
  }

  async afterRequest(_options: IOptions, call: Call): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      void addToQueue({
        name: 'afterRequest',
        resolve: () => resolve(),
        reject,
        task: async () => {
          await sleep(3000);
          const driver = getDriver();
          await PlaywrightContextHelpers.switchToNativeContext();
          const image = await driver.takeScreenshot();
          call.attachments = call.attachments ?? [];
          call.attachments.push({
            data: `data:image/png;base64,${image}`,
            type: 'image',
          });

          await sleep(3000);
          if (this.allCapsCancel.includes(call.methodName)) {
            await AssetWatchBottomSheet.tapCancelButton();
          } else if (call.methodName === 'wallet_revokePermissions') {
            await BrowserView.tapLocalHostDefaultAvatar();
            await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
          } else {
            await PlaywrightContextHelpers.switchToNativeContext();
            const cancelButton = Matchers.getElementByText('Cancel');
            await Gestures.waitAndTap(cancelButton, {
              elemDescription: 'Cancel confirmation',
            });
          }
        },
      });
    });
  }

  async afterResponse(_options: IOptions, call: Call): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      void addToQueue({
        name: 'afterResponse',
        resolve: () => resolve(),
        reject,
        task: async () => {
          if (this.requiresEthAccountsPermission.includes(call.methodName)) {
            await requestViaEthereumProvider(
              this.pageUrl,
              'wallet_revokePermissions',
              [{ eth_accounts: {} }],
            );
          }
        },
      });
    });
  }

  validateCall(call: Call): Call {
    if (call.error) {
      call.valid = call.error.code === 4001;
      if (!call.valid) {
        call.reason = `Expected error code 4001, got ${call.error.code}`;
      }
    }
    return call;
  }
}
