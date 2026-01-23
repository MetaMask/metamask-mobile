/// <reference path="../types/detox.d.ts" />
import { device } from 'detox';
import { addToQueue } from './helpers';
import paramsToObj from '@open-rpc/test-coverage/build/utils/params-to-obj';
import TestHelpers from '../helpers';
import Matchers from '../../tests/framework/Matchers';
import Gestures from '../../tests/framework/Gestures';
import ConnectBottomSheet from '../pages/Browser/ConnectBottomSheet';
import AssetWatchBottomSheet from '../pages/Transactions/AssetWatchBottomSheet';
import SpamFilterModal from '../pages/Browser/SpamFilterModal';
import BrowserView from '../pages/Browser/BrowserView';
import ConnectedAccountsModal from '../pages/Browser/ConnectedAccountsModal';

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';

import Assertions from '../../tests/framework/Assertions';
import PermissionSummaryBottomSheet from '../pages/Browser/PermissionSummaryBottomSheet';

const getBase64FromPath = async (path) => {
  const data = await fs.promises.readFile(path);
  return data.toString('base64');
};

export default class ConfirmationsRejectRule {
  constructor(options) {
    this.driver = options.driver; // Pass element for detox instead of all the driver
    this.only = options.only;
    this.allCapsCancel = ['wallet_watchAsset'];
    this.permissionConnectionSheet = ['wallet_revokePermissions'];
    this.requiresEthAccountsPermission = [
      'personal_sign',
      'eth_signTypedData_v4',
      'eth_getEncryptionPublicKey',
      'wallet_revokePermissions',
    ];
  }

  getTitle() {
    return 'Confirmations Rejection Rule';
  }

  async beforeRequest(_, call) {
    await new Promise((resolve, reject) => {
      addToQueue({
        name: 'beforeRequest',
        resolve,
        reject,
        task: async () => {
          if (this.requiresEthAccountsPermission.includes(call.methodName)) {
            const requestPermissionsRequest = JSON.stringify({
              jsonrpc: '2.0',
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }],
            });

            await this.driver.runScript(`(el) => {
                window.ethereum.request(${requestPermissionsRequest})
              }`);

            /**
             *
             * Screenshot Code Section
             *
             */

            // Connect accounts modal
            await ConnectBottomSheet.tapConnectButton();
            await Assertions.checkIfNotVisible(
              PermissionSummaryBottomSheet.container,
            );
            await TestHelpers.delay(3000);

            try {
              await Assertions.checkIfVisible(SpamFilterModal.title);
              await SpamFilterModal.tapCloseButton();
              await Assertions.checkIfNotVisible(SpamFilterModal.title);
            } catch {
              /* eslint-disable no-console */

              console.log('The spam modal is not visible');
            }
          }

          // we need this because mobile doesnt support just raw json signTypedData, it requires a stringified version
          // it was fixed and should get it in @metamask/message-manager@7.0.1
          if (call.methodName === 'eth_signTypedData_v4') {
            call.params[1] = JSON.stringify(call.params[1]);
          }
        },
      });
    });
  }

  // get all the confirmation calls to make and expect to pass
  // Need this now?
  getCalls(_, method) {
    const calls = [];
    const isMethodAllowed = this.only ? this.only.includes(method.name) : true;
    if (isMethodAllowed) {
      if (method.examples) {
        // pull the first example
        const e = method.examples[0];
        const ex = e;

        if (!ex.result) {
          return calls;
        }
        const p = ex.params.map((e) => e.value);
        const params =
          method.paramStructure === 'by-name'
            ? paramsToObj(p, method.params)
            : p;
        calls.push({
          title: `${this.getTitle()} - with example ${ex.name}`,
          methodName: method.name,
          params,
          url: '',
          resultSchema: method.result.schema,
          expectedResult: ex.result.value,
        });
      } else {
        // naively call the method with no params
        calls.push({
          title: `${method.name} > confirmation rejection`,
          methodName: method.name,
          params: [],
          url: '',
          resultSchema: method.result.schema,
        });
      }
    }
    return calls;
  }

  async afterRequest(_, call) {
    await new Promise((resolve, reject) => {
      addToQueue({
        name: 'afterRequest',
        resolve,
        reject,
        task: async () => {
          await TestHelpers.delay(3000);
          const imagePath = await device.takeScreenshot(
            `afterRequest-${this.getTitle()}`,
          );
          const image = await getBase64FromPath(imagePath);
          call.attachments = call.attachments || [];
          call.attachments.push({
            data: `data:image/png;base64,${image}`,
            image,
            type: 'image',
          });
          let cancelButton;
          await TestHelpers.delay(3000);
          if (this.allCapsCancel.includes(call.methodName)) {
            await AssetWatchBottomSheet.tapCancelButton();
          } else if (call.methodName === 'wallet_revokePermissions') {
            await BrowserView.tapLocalHostDefaultAvatar();
            await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
          } else {
            cancelButton = await Matchers.getElementByText('Cancel');
            await Gestures.waitAndTap(cancelButton);
          }
        },
      });
    });

    /**
     *
     * Screen shot code section
     */
  }

  async afterResponse(_, call) {
    await new Promise((resolve, reject) => {
      addToQueue({
        name: 'afterResponse',
        resolve,
        reject,
        task: async () => {
          // Revoke Permissions
          if (this.requiresEthAccountsPermission.includes(call.methodName)) {
            const revokePermissionRequest = JSON.stringify({
              jsonrpc: '2.0',
              method: 'wallet_revokePermissions',
              params: [{ eth_accounts: {} }],
            });

            await this.driver.runScript(`(el) => {
              window.ethereum.request(${revokePermissionRequest})
            }`);
          }
        },
      });
    });
  }

  validateCall(call) {
    if (call.error) {
      call.valid = call.error.code === 4001;
      if (!call.valid) {
        call.reason = `Expected error code 4001, got ${call.error.code}`;
      }
    }
    return call;
  }
}
