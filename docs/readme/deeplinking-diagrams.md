# Deeplink Processing Visual Diagrams

> 📚 **[Back to Main Deeplink Guide](./deeplinking.md)** for detailed explanations, implementation steps, and code examples

## Quick Navigation

- [Complete Deeplink Flow](#complete-deeplink-flow-with-signature-verification) - Main processing pipeline
- [Signature Creation & Verification](#signature-creation-and-verification-detail) - How signing works
- [Dynamic Parameters](#dynamic-parameters-example) - Adding unsigned params
- [Common Scenarios](#common-scenarios) - Real-world examples

---

## Complete Deeplink Flow with Signature Verification

**Related Documentation:** [How Link Processing Works](./deeplinking.md#how-link-processing-works)

```mermaid
flowchart TD
    Start[User Clicks Deeplink<br/>https://link.metamask.io/perps?...] --> EarlyIntercept{SDKConnectV2<br/>MWP Deeplink?}

    EarlyIntercept -->|Yes| MWP[SDKConnectV2.handleMwpDeeplink<br/>Early WebSocket connection]
    EarlyIntercept -->|No| Parse[DeeplinkManager.parse<br/>Extract URL components and params]

    Parse --> Protocol{Protocol?}
    Protocol -->|HTTPS/HTTP/metamask| Universal[handleUniversalLink<br/>metamask:// converted to https://]
    Protocol -->|wc://| WCHandler[connectWithWC<br/>WalletConnect handler]
    Protocol -->|ethereum://| EthHandler[handleEthereumUrl<br/>EIP-681 handler]
    Protocol -->|dapp://| DappHandler[handleDappUrl<br/>In-app browser]

    Universal --> Domain{Domain Valid?<br/>link.metamask.io or<br/>link-test.metamask.io?}
    Domain -->|No| InvalidDomain[INVALID DOMAIN<br/>Show error modal]
    Domain -->|Yes| CheckSig{Has Signature?<br/>url.searchParams.has'sig'}

    CheckSig -->|Yes| VerifySig[Verify Signature]
    CheckSig -->|No| PublicLink1[PUBLIC LINK]

    VerifySig --> BuildCanonical[Build Canonical URL<br/>• Get params from sig_params list<br/>• Include sig_params itself<br/>• Sort alphabetically]
    BuildCanonical --> CryptoVerify[Verify with Public Key<br/>ECDSA P-256]

    CryptoVerify -->|VALID| PrivateLink[PRIVATE LINK<br/>Trusted source]
    CryptoVerify -->|INVALID| PublicLink3[PUBLIC LINK<br/>Demoted - invalid signature]
    CryptoVerify -->|MISSING| PublicLink2[PUBLIC LINK<br/>No signature]

    PrivateLink --> Modal
    PublicLink1 --> Modal
    PublicLink2 --> Modal
    PublicLink3 --> Modal
    InvalidDomain --> Modal

    Modal[Interstitial Modal Decision] --> BypassCheck{Bypass Conditions?}
    BypassCheck -->|Whitelisted Action| Skip[Skip modal<br/>WC, enable-card-button]
    BypassCheck -->|Whitelist URL| Skip
    BypassCheck -->|Private + In-App Source| Skip
    BypassCheck -->|None| ModalType

    ModalType{Link Type?}
    ModalType -->|Private| ShowPrivate[Show confirmation<br/>can remember choice]
    ModalType -->|Public| ShowPublic[Show security warning]
    ModalType -->|Invalid| ShowInvalid[Show 'Page doesn't exist' modal]
    ModalType -->|Unsupported| ShowUnsupported[Show 'Not supported' modal]

    ShowPrivate --> UserContinue{User Continues?}
    ShowPublic --> UserContinue
    ShowInvalid --> UserContinue
    ShowUnsupported --> UserContinue
    Skip --> Route

    UserContinue -->|Yes| Route[Action Routing]
    UserContinue -->|No| End[End]

    Route --> Action{Action Type?}
    Action -->|swap| HandleSwap[handleSwapUrl]
    Action -->|buy/sell| HandleRamp[handleRampUrl]
    Action -->|deposit| HandleDeposit[handleDepositCashUrl]
    Action -->|home| HandleHome[navigateToHomeUrl]
    Action -->|perps/perps-markets| HandlePerps[handlePerpsUrl]
    Action -->|perps-asset| NotImplemented[⚠️ NOT IMPLEMENTED]
    Action -->|predict| HandlePredict[handlePredictUrl]
    Action -->|rewards| HandleRewards[handleRewardsUrl]
    Action -->|dapp| HandleBrowser[handleBrowserUrl]
    Action -->|create-account| HandleAccount[handleCreateAccountUrl]
    Action -->|onboarding| HandleOnboard[handleFastOnboarding]
    Action -->|enable-card-button| HandleCard[handleEnableCardButton]
    Action -->|wc/send| HandleRecurse[Recursive parse call]
    Action -->|SDK actions| HandleSDK[handleMetaMaskDeeplink]

    HandleSwap --> Execute
    HandleRamp --> Execute
    HandleDeposit --> Execute
    HandleHome --> Execute
    HandlePerps --> Execute
    HandlePredict --> Execute
    HandleRewards --> Execute
    HandleBrowser --> Execute
    HandleAccount --> Execute
    HandleOnboard --> Execute
    HandleCard --> Execute
    HandleRecurse --> Execute
    HandleSDK --> Execute
    NotImplemented --> NoOp[No action taken]

    Execute[Handler Execution<br/>1. Parse parameters<br/>2. Navigate to screen<br/>3. Pass data to components<br/>4. Update app state]

    style Start fill:#e1f5ff
    style PrivateLink fill:#d4edda
    style PublicLink1 fill:#fff3cd
    style PublicLink2 fill:#fff3cd
    style PublicLink3 fill:#fff3cd
    style InvalidDomain fill:#f8d7da
    style Execute fill:#d4edda
    style MWP fill:#e1f5ff
    style NotImplemented fill:#f8d7da
    style NoOp fill:#f8d7da
```

## Signature Creation and Verification Detail

**Related Documentation:** [Signature Verification](./deeplinking.md#signature-verification)

### Server-Side (link-signer-api)

```mermaid
flowchart TD
    Input[INPUT:<br/>https://link.metamask.io/perps?screen=asset&symbol=BTC]

    Input --> Extract[Extract All Parameters<br/>params = screen, symbol]
    Extract --> CreateSigParams[Create sig_params<br/>sig_params = 'screen,symbol']
    CreateSigParams --> AddToURL[Add sig_params to URL<br/>Sort all parameters]
    AddToURL --> Sign[Sign Complete URL<br/>ECDSA P-256 with Private Key]
    Sign --> Append[Append Signature<br/>sig = base64url signature]
    Append --> Output[OUTPUT:<br/>https://link.metamask.io/perps?screen=asset&<br/>sig_params=screen,symbol&symbol=BTC&sig=MEUCIQDx...]

    style Input fill:#e1f5ff
    style Output fill:#d4edda
```

### Client-Side (MetaMask Mobile)

```mermaid
flowchart TD
    Input[INPUT:<br/>https://link.metamask.io/perps?screen=asset&<br/>sig_params=screen,symbol&symbol=BTC&sig=MEUCIQDx...]

    Input --> ExtractParams[Extract sig_params<br/>'screen,symbol' → screen, symbol]
    ExtractParams --> BuildCanonical[Build Canonical URL<br/>Include ONLY:<br/>• params in sig_params list<br/>• sig_params itself<br/>• Sort alphabetically]
    BuildCanonical --> Canonical[Canonical URL:<br/>?screen=asset&sig_params=screen,symbol&symbol=BTC]
    Canonical --> Verify[Verify Signature<br/>ECDSA P-256 with Public Key]

    Verify -->|✅| Valid[VALID<br/>Signature matches]
    Verify -->|❌| Invalid[INVALID<br/>Signature doesn't match]

    style Input fill:#e1f5ff
    style Valid fill:#d4edda
    style Invalid fill:#f8d7da
```

## Dynamic Parameters Example

**Related Documentation:** [Benefits of Dynamic Signing (sig_params)](./deeplinking.md#benefits-of-dynamic-signing-sig_params)

```mermaid
flowchart TD
    Server[SIGNED URL FROM SERVER<br/>https://link.metamask.io/swap?<br/>from=eip155:1/slip44:60&sig_params=from&sig=X]

    Server --> Client[CLIENT ADDS UNSIGNED PARAMS<br/>debug=true, userId=123]

    Client --> Final[FINAL URL TO VERIFY<br/>https://link.metamask.io/swap?from=eip155:1/slip44:60&<br/>debug=true&userId=123&<br/>sig_params=from&sig=X]

    Final --> Canonicalize[CANONICALIZATION FOR VERIFY<br/><br/>sig_params says: 'from'<br/>canonical URL = ?from=eip155:1/slip44:60&sig_params=from<br/><br/>debug and userId are IGNORED<br/>not in sig_params]

    Canonicalize --> Valid[✅ SIGNATURE VALID!<br/>Because canonical URL<br/>matches what was signed]

    style Server fill:#e1f5ff
    style Client fill:#fff3cd
    style Final fill:#e1f5ff
    style Canonicalize fill:#f0f0f0
    style Valid fill:#d4edda
```

## Common Scenarios

**Related Documentation:** [Link Types](./deeplinking.md#link-types) | [Testing Links](./deeplinking.md#testing-links)

### Scenario 1: Marketing Campaign (Public Link)

```mermaid
flowchart LR
    Click[User clicks<br/>https://link.metamask.io/buy] --> NoSig[No signature]
    NoSig --> Warning[Shows warning interstitial]
    Warning --> Proceed{User proceeds?}
    Proceed -->|Yes| Buy[handleRampUrl<br/>Opens buy screen]
    Proceed -->|No| Cancel[Cancelled]

    style Click fill:#e1f5ff
    style Warning fill:#fff3cd
    style Buy fill:#d4edda
```

### Scenario 2: Internal Testing (Private Link)

```mermaid
flowchart LR
    Click[User clicks<br/>https://link.metamask.io/perps?<br/>sig=XXX&sig_params=...] --> HasSig[Has valid signature]
    HasSig --> Confirm[Shows confirmation<br/>or skips if remembered]
    Confirm --> Proceed{User proceeds?}
    Proceed -->|Yes| Perps[handlePerpsUrl<br/>Opens perps with<br/>trusted params]
    Proceed -->|No| Cancel[Cancelled]

    style Click fill:#e1f5ff
    style HasSig fill:#d4edda
    style Perps fill:#d4edda
```

### Scenario 3: Tampered Link (Demoted to Public)

```mermaid
flowchart LR
    Click[User clicks<br/>https://link.metamask.io/swap?<br/>amount=1000&sig=XXX] --> Check[Signature doesn't match<br/>amount was changed]
    Check --> Demoted[Link demoted to PUBLIC<br/>isPrivateLink = false]
    Demoted --> Warning[Shows public link<br/>security warning]
    Warning --> Proceed{User proceeds?}
    Proceed -->|Yes| Handler[handleSwapUrl<br/>Proceeds as untrusted]
    Proceed -->|No| Cancelled[Cancelled]

    style Click fill:#e1f5ff
    style Check fill:#fff3cd
    style Demoted fill:#fff3cd
    style Warning fill:#fff3cd
    style Handler fill:#d4edda
```

> ⚠️ **Important**: Invalid signatures do NOT show the "page doesn't exist" modal. Instead, the link is treated as an untrusted public link. Only invalid domains or unsupported actions show the INVALID modal.

### Scenario 4: WalletConnect (Whitelisted)

```mermaid
flowchart LR
    Click[User clicks<br/>https://link.metamask.io/wc?<br/>uri=wc:123...] --> Whitelist[WC action is whitelisted]
    Whitelist --> Skip[Skips interstitial<br/>completely]
    Skip --> WC[Recursive parse call<br/>→ connectWithWC]

    style Click fill:#e1f5ff
    style Whitelist fill:#d4edda
    style WC fill:#d4edda
```

### Scenario 5: In-App Private Link (Bypass Modal)

```mermaid
flowchart LR
    Click[User clicks signed link<br/>from carousel/notification] --> Check[Valid signature +<br/>In-app source]
    Check --> Bypass[Bypasses modal<br/>completely]
    Bypass --> Handler[Direct to handler]

    style Click fill:#e1f5ff
    style Check fill:#d4edda
    style Bypass fill:#d4edda
    style Handler fill:#d4edda
```

### Scenario 6: Prediction Markets

```mermaid
flowchart LR
    Click[User clicks<br/>https://link.metamask.io/predict?<br/>market=23246] --> Parse[Parse market ID]
    Parse --> Modal[Show interstitial]
    Modal --> Proceed{User proceeds?}
    Proceed -->|Yes| Predict[handlePredictUrl<br/>Opens market details]
    Proceed -->|No| Cancel[Cancelled]

    style Click fill:#e1f5ff
    style Predict fill:#d4edda
```

### Scenario 7: Swap with CAIP-19 (Modern Format)

```mermaid
flowchart LR
    Click[User clicks<br/>https://link.metamask.io/swap?<br/>from=eip155:1/erc20:0x...&<br/>to=eip155:137/erc20:0x...] --> Parse[Parse CAIP-19 tokens]
    Parse --> Modal[Show interstitial]
    Modal --> Proceed{User proceeds?}
    Proceed -->|Yes| Swap[handleSwapUrl<br/>Opens bridge view<br/>with tokens pre-filled]
    Proceed -->|No| Cancel[Cancelled]

    style Click fill:#e1f5ff
    style Swap fill:#d4edda
```

### Scenario 8: Invalid Domain (Actually Invalid)

```mermaid
flowchart LR
    Click[User clicks<br/>https://fake.metamask.io/swap] --> Check[Domain check fails<br/>Not in allowed list]
    Check --> Invalid[INVALID LINK<br/>isInvalidLink = true]
    Invalid --> Modal[Shows 'This page<br/>doesn't exist' modal]
    Modal --> Options[Options:<br/>• Update app<br/>• Go to home]

    style Click fill:#e1f5ff
    style Check fill:#f8d7da
    style Invalid fill:#f8d7da
    style Modal fill:#f8d7da
```

### Scenario 9: Predict with Analytics (utm_source)

```mermaid
flowchart LR
    Click[User clicks<br/>https://link.metamask.io/predict?<br/>market=23246&utm_source=twitter] --> Parse[Parse market + utm_source]
    Parse --> Modal[Show interstitial]
    Modal --> Proceed{User proceeds?}
    Proceed -->|Yes| Predict[handlePredictUrl<br/>entryPoint='deeplink_twitter']
    Proceed -->|No| Cancel[Cancelled]

    style Click fill:#e1f5ff
    style Predict fill:#d4edda
```

> 📝 **Note**: The `utm_source` parameter is appended to the entry point for analytics tracking.
