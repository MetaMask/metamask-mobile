# Signature Request Pages

#### MetaMask mobile support for 5 different signature requests:

1. ETH Sign: ETH sign is disabled by default. It can be enabled from advanced settings.

 <img src="https://github.com/MetaMask/metamask-mobile/blob/signature_request_refactoring_doc/docs/confirmation-refactoring/signature-requests/eth_sign.png?raw=true" width="150"/>

2. Personal Sign

 <img src="https://github.com/MetaMask/metamask-mobile/blob/signature_request_refactoring_doc/docs/confirmation-refactoring/signature-requests/personal_sign.png?raw=true" width="150"/>

3. Sign Typed Data V1

 <img src="https://github.com/MetaMask/metamask-mobile/blob/signature_request_refactoring_doc/docs/confirmation-refactoring/signature-requests/sign_typed_data_v1.png?raw=true" width="150"/>

4. Sign Typed Data V3

 <img src="https://github.com/MetaMask/metamask-mobile/blob/signature_request_refactoring_doc/docs/confirmation-refactoring/signature-requests/sign_typed_data_v3.png?raw=true" width="150"/>

5. Sign Typed Data V4

 <img src="https://github.com/MetaMask/metamask-mobile/blob/signature_request_refactoring_doc/docs/confirmation-refactoring/signature-requests/sign_typed_data_v4.png?raw=true" width="150"/>

### Current flow of Signature Request:

<img src="https://github.com/MetaMask/metamask-mobile/blob/signature_request_refactoring_doc/docs/confirmation-refactoring/signature-requests/signature_request_flow.png?raw=true"/>

1. RPC request coming from DAPP is handled by [Message Managers](https://github.com/MetaMask/core/tree/main/packages/message-manager) defined in [@metamask/core](https://github.com/MetaMask/core)

   - ETH Signature requests are handled by [MessageManager](https://github.com/MetaMask/core/blob/main/packages/message-manager/src/MessageManager.ts)
   - Personal Message Signature requests are handled by [PersonalMessageManager](https://github.com/MetaMask/core/blob/main/packages/message-manager/src/PersonalMessageManager.ts)
   - Typed Message Signature requests are handled by [TypedMessageManager](https://github.com/MetaMask/core/blob/main/packages/message-manager/src/TypedMessageManager.ts)

2. [RootRPCMethodsUI](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/Nav/Main/RootRPCMethodsUI.js) has event listeners defined to handle new un-approved message. It triggers the signature modal and renders one of the following components:

   - [MessageSign](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/MessageSign)
   - [PersonalSign](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/PersonalSign)
   - [TypedSign](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/TypedSign)

3. All the 3 Signature Request components use [SignatureRequest](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/SignatureRequest) child component to render the page.

### Proposed Refactoring / Code Cleanup:

1. [RootRPCMethodsUI](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/Nav/Main/RootRPCMethodsUI.js): All Signature request related code from here should all be moved to a component `/app/components/Nav/UI/SignatureRequestBase`. This component will have events listeners for `un-approved messages` and render modal appropriately. `SignatureRequestBase` can be imported in `RootRPCMethodsUI`.
2. Signature Request Components - [MessageSign](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/MessageSign), [PersonalSign](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/PersonalSign), [TypedSign](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/TypedSign). The 3 components have a lot of code duplication:
   - `showWalletConnectNotification` this function is duplicated in 3 components. It can be moved to [SignatureRequest](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/SignatureRequest)
     Additionally this is partially duplicated at many places in the app and should be moved to a re-usable utility function.
   - Methods `signMessage`, `rejectMessage`, `cancelSignature`, `confirmSignature` are also duplicated at 3 places. These should be moved to [SignatureRequest](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/SignatureRequest)
   - The logic to conditionally show expanded message [here](https://github.com/MetaMask/metamask-mobile/blob/main/app/components/UI/MessageSign/index.js#L224) can also be moved to [SignatureRequest](https://github.com/MetaMask/metamask-mobile/tree/main/app/components/UI/SignatureRequest)

Creating functional react components using TypeScript and adding unit test coverage is a requirement or all of this component refactoring.
