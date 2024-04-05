# Approve

This confirmation page allows user to give approval to their assets:

1. Giving approval to token:
   <img src="https://github.com/MetaMask/metamask-mobile/blob/approve_architectural_doc/docs/confirmation-refactoring/approve/approve_token.png?raw=true" width="150"/>

2. Giving approval to collectibles:
   <img src="https://github.com/MetaMask/metamask-mobile/blob/approve_architectural_doc/docs/confirmation-refactoring/approve/approve_collectible.png?raw=true" width="150"/>

The component responsible for rendering this view is: [/Views/ApproveView/Approve](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/Views/ApproveView/Approve)

### Refactoring `/Views/ApproveView/Approve`

This is a well defined component. The components also includes 3 small child components: - [ShowBlockExplorer](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/ApproveTransactionReview/ShowBlockExplorer) - [AddNickName](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/ApproveTransactionReview/AddNickname) - [ApproveTransactionReview](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/UI/ApproveTransactionReview/index.js)
Following are the improveement areas:

1. The file path can be improved to `/Views/Approve` as it is the only component in `/Views/ApproveView` folder.
2. The component has few methods are are quite generic and should be fully or partially converted to reusable functions in utils or hooks:
   - For gas polling its proposed to create re-usable hook [here](https://github.com/MetaMask/metamask-mobile/pull/6003/files#diff-7c74af67b37335b69af34b0dc466c46bc3a08e37832414f7eba12984bcbf5abfR119), the hook can be used in this component also.
   - Function [validateGas](https://github.com/MetaMask/metamask-mobile/blob/a803bec1d941f92062349f1edb619f447819f932/app/components/Views/ApproveView/Approve/index.js#L326)
   - Function [prepareTransaction](https://github.com/MetaMask/metamask-mobile/blob/a803bec1d941f92062349f1edb619f447819f932/app/components/Views/ApproveView/Approve/index.js#L350)
3. Nested ternary conditions like used [here](https://github.com/MetaMask/metamask-mobile/blob/a803bec1d941f92062349f1edb619f447819f932/app/components/Views/ApproveView/Approve/index.js#L625) are avoidable.
4. AddNickName, ApproveTransactionReview components also has logic to show block explorer which looks redundant [here](https://github.com/MetaMask/metamask-mobile/blob/a803bec1d941f92062349f1edb619f447819f932/app/components/UI/ApproveTransactionReview/AddNickname/index.tsx#L150) and [here](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L949).

### Refactoring `/UI/ApproveTransactionReview`

`/UI/ApproveTransactionReview` is another very huge component used on this page that needs code cleanup.

1. The function is responsible for rendering many sections of the page, it can be simplified by breaking it down into more well tested sub-components:
   - [renderGasTooltip](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L564)
   - [renderEditPermission](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L596)
   - [renderDetails](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L630)
   - [renderTransactionReview](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L847)
   - [renderVerifyContractDetails](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L885)
   - [renderQRDetails](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L996)
2. Functions like [goToFaucet](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L986), [buyEth](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L962), [fetchEstimatedL1Fee](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L271) can be utility method / hook.
3. The code in [componentDidMount](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L293) can be converted extracted into utility function or hook.
4. Nested ternary like [here](https://github.com/MetaMask/metamask-mobile/blob/f5d3bb82924bce231fee76ef29d7ba077886bc17/app/components/UI/ApproveTransactionReview/index.js#L1032) is avoidable.

### Other Code Improvements:

1. Creating re-usable Modal component: In a lot of confirmation pages Modal component is initialised [example](https://github.com/MetaMask/metamask-mobile/blob/a803bec1d941f92062349f1edb619f447819f932/app/components/Views/ApproveView/Approve/index.js#L606). Many of the props passed are similar. We can create a re-usable components to avoid duplicating the props at all places.
2. At a lot of places we display gas selection modals like [this](https://github.com/MetaMask/metamask-mobile/blob/a803bec1d941f92062349f1edb619f447819f932/app/components/Views/ApproveView/Approve/index.js#L690). We should be able to create a single component which takes transaction and depending on the type legacy or EIP-1559 display gas options.
3. All react native components should be converted to functional typescript components with unit test coverage.
4. Child components which are possibly re-usable should be placed in folder [/components/UI](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/UI) and not nested in sub-folders.
