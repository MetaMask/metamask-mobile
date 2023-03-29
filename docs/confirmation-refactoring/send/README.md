# Send

Metamask mobile supports send flow for ETH and other assets. This view is rendered by components:

- [/Views/SendFlow](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/Views/SendFlow/SendTo)
- [/Views/Send](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/Views/Send)

### Folder Structure

Currently above two views have confusing folder structure and component names. We should make it more clear and understandable.

Current folder structure:
<img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_view_structure.png?raw=true" width="150"/>

Proposed folder structure:

```
   - Send
        - Amount
        - Confirm
        - index.tsx
        - Send.tsx
        - Send.test.tsx
   - SendTo
        - AddressElement
        - AddressInputs
        - AddressList
        - ErrorMessage
        - WarningMessage
        - index.tsx
        - SendTo.tsx
        - SendTo.test.tsx
```

There will be more components added to the list above as we do refactoring to break down bigger components into smaller ones.

### SendTo Component

[/Views/SendFlow/SendTo](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/Views/SendFlow/SendTo) is responsible to render first send page where receipient address is selected:

<img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_to.png?raw=true" width="150"/>

The component is taking care to do following:

- Render `address from / to` section in the top:

    <img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_fromto.png?raw=true" width="150"/>

- Render `to address` selection options:

    <img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_acclist.png?raw=true" width="150"/>

- Render option to add `to address` to `address book`:

    <img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_addressbook.png?raw=true" width="150"/>

- Render different errors / warnings messages:

    <img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_warnings.png?raw=true" width="150"/>

  All of above concerns should be moved into small independent components which can be well tested. The smaller components can be placed in [/components/UI](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI). Components which are possibly re-usable at other places should not be nested in sub-folders but directly put inside [/components/UI](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI).

### Send Component

[/Views/Send](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/Views/Send) component is responsible to render following 2 pages:

1. Transaction amount is entered:
   <img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_amount.png?raw=true" width="150"/>

2. Transactionis confirmed:
   <img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_confirm.png?raw=true" width="150"/>

#### Amount Page

Amount page is rendered by [/Views/SendFlow/Amount](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/Views/SendFlow/Amount) component. The page is again quite huge and taking care of 2 different categories inputs:

- token amount input
- asset input

These can be broken down into 2 different components to reduce complexity of this component.

Additionally the components has a lot of different transaction / gas related methods defined in it, these should be converted(fully or partially) into reusable utility methods or hooks. A function not requiring state changes can be made a utility method, function more closely tied to state change should be hook. Here is a list of the methods I could find but there will be more to it:

1. Code [here](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L476) to estimate total gas for both Legacy and EIP-1559 gas estimates.
2. Function [ValidateCollectibleOwnership](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L546)
3. Function [getCollectibleTranferTransactionProperties](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L630)
4. Functions [updateTransaction](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L671), [prepareTransaction](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L711). It might be useful to add these to [transaction reducer](https://github.com/MetaMask/metamask-mobile/blob/main/app/reducers/transaction/index.js) or move it to [util/transactions](https://github.com/MetaMask/metamask-mobile/blob/main/app/util/transactions/index.js).
5. Function [validateAmount](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L746)
6. Function [estimateGasLimit](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L782)
7. Function [useMax](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L795)
8. For conversion methods used at places as [these](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L863) we can defined utility methods or hooks.
9. Function [processCollectibles](https://github.com/MetaMask/metamask-mobile/blob/e8f8544e64a71d3846153a65e75149687324df31/app/components/Views/SendFlow/Amount/index.js#L1067)

#### Confirm Page

Confirm page is rendered by [/Views/SendFlow/Confirm](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/Views/SendFlow/Confirm) component.

This component is again taking care to render a lot of different sections of the page. These should be extracted out into smaller well tested sub-components:

1. Address from / to section:

   There is already a [PR](https://github.com/MetaMask/metamask-mobile/pull/5900) to extract this out into a separate component.

   <img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_confirm_address.png?raw=true" width="150"/>

2. Gas EIP-1559 modal:

<img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_confirm_gas.png?raw=true" width="150"/>

3. Legacy Gas modal
4. Custom Nonce modal
5. Hex Data modal
6. Transaction Info:

<img src="https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/docs/confirmation-refactoring/send/send_confirm_info.png?raw=true" width="150"/>

The component also has a lot of different transaction / gas related methods defined in it; these should be converted (fully or partially) into reusable utility methods or hooks:

1. Function [parseTransactionDataHeader](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L509)
2. Function [validateGas](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L612) is not used and can be removed.
3. Function [prepareTransactionToSend](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L627)
4. Function [validateAmount](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L686)
5. Function [getBalanceError](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L816)
6. Functions [buyEth](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L1096), [goToFaucet](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L1108)
7. Logic to validate transaction [here](https://github.com/MetaMask/metamask-mobile/blob/de80215b19337e45c8dee5d492645d3ff899822e/app/components/Views/SendFlow/Confirm/index.js#L638)
8. Function [checkRemoveCollectible](https://github.com/MetaMask/metamask-mobile/blob/send_architectural_doc/app/components/Views/SendFlow/Confirm/index.js#L666)

#### Other refactoring areas:

1. A lot of components have logic to update NarBar defined as:
   ```
   componentDidUpdate = () => {
       this.updateNavBar();
   };
   ```
   As we make components functional this can be converted to a tested re-usable hook used across all the components.
2. Code to start / stop gas polling is used at a few places; it can be converted to a re-usable hook.

3. Different send pages have functions to update transaction - there is [reducer](https://github.com/MetaMask/metamask-mobile/blob/main/app/reducers/transaction/index.js) defined for updating transaction we should use this to add any transaction update related methods to ensure that all transaction update logic is at one place.

4. Also, there is a transaction [utility file](https://github.com/MetaMask/metamask-mobile/blob/main/app/util/transactions/index.js) any re-usable transaction utility methods should be moved to it.

5. A requirement for all the editing is to write Functional React components using TypeScript and ensure Test coverage.
