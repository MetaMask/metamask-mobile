# DAPP Transactions

For all transactions coming from the DAPP (except approve) this view is shown, these transactions include:

1. Transfer ETH or other token
2. Create Token
3. Deploy Contract
4. Deploy Collectible, etc

<img src="https://github.com/MetaMask/metamask-mobile/blob/dapp_transaction_architectural_doc/docs/confirmation-refactoring/dapp-transaction/create_token.png?raw=true" width="150"/>

<img src="https://github.com/MetaMask/metamask-mobile/blob/dapp_transaction_architectural_doc/docs/confirmation-refactoring/dapp-transaction/transfer_token.png?raw=true" width="150"/>

The component responsible for rendering this view is: [/Views/Approval](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/Views/Approval)

### Refactoring `/Views/Approval`

1. Function [isTXStatusCancellable](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/Views/Approval/index.js#L150) can be converted to a utility function.

2. Function [handleAppStateChange](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/Views/Approval/index.js#L163) is re-used at many places in codebase. It will be useful to extract this into a re-usable hook.

3. Function [showWalletConnectNotification](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/Views/Approval/index.js#L280) is partially duplicated at many places in the app and should be extracted into a re-usable utility function.

4. Functions [prepareTransaction](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/Views/Approval/index.js#L406) and [prepareAssetTransaction](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/Views/Approval/index.js#L438) can be make re-usable utility functions. These can be made re-usable across confirmation components.

### Refactoring `/UI/TransactionEditor`

1. Function [handleDataGeneration](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/UI/TransactionEditor/index.js#L477), [validateTotal](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/UI/TransactionEditor/index.js#L541), [computeGasExtimates](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/UI/TransactionEditor/index.js#L147), [validateToAddress](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/UI/TransactionEditor/index.js#L575) should be utility functions.
2. State variable names [here](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/UI/TransactionEditor/index.js#L134) like `ready`, `over` are very confusing.

### Refactoring `/UI/ApproveTransactionReview`

This is covered already in document for refactoring Approve flow [here](https://github.com/MetaMask/metamask-mobile/pull/6024).

### Other Code Improvements:

Most of these points are covered in previous documents, but addding these here also as these are application to DAPP transaction related components also:

1. Code to start / stop gas polling is duplicated at couple of places and should be moved to a re-usable hook.
2. As detailed in refactoring send flow document, a lot of components have logic to `updateNavBar` as [here](https://github.com/MetaMask/metamask-mobile/blob/e3f89a49a672b7c74419b4c6c9fc34a3ae9be023/app/components/Views/Approval/index.js#L121). This can be refactored out into a reusable hook.
3. Component [AnimatedTransactionModal](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/UI/AnimatedTransactionModal/index.js) needs to be converted into a functional component using TypeScript.
4. Component [WatchAssetRequest](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/UI/WatchAssetRequest/index.js) to be refactored into functional component using TypeScript.
5. At a lot of places we display gas selection modals like [this](https://github.com/MetaMask/metamask-mobile/blob/a803bec1d941f92062349f1edb619f447819f932/app/components/Views/ApproveView/Approve/index.js#L690). We should be able to create a single component which takes transaction and depending on the type legacy or EIP-1559 display gas options.
6. All react native components should be converted to functional typescript components with unit test coverage.
7. Components which are possibly re-usable should be placed in folder [/components/UI](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/UI) and not nested in sub-folders.
8. Transaction related utils are placed at a couple of places as [here](https://github.com/MetaMask/metamask-mobile/tree/main/app/util) like [/util/transactions](https://github.com/MetaMask/metamask-mobile/tree/main/app/util/transactions), [/util/dappTransaction](https://github.com/MetaMask/metamask-mobile/tree/main/app/util/dappTransactions). These can be moved together into same folder.
