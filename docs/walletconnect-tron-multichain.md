# WalletConnect Multichain — Intégration Tron dans MetaMask Mobile

> Document de recherche technique — Mars 2026
>
> Sources : codebase MetaMask Mobile, repos `connect-tron` et `multichain-api-client`, documentation Reown/WalletConnect, standards CAIP.

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Architecture actuelle — WalletConnect EVM-only](#2-architecture-actuelle--walletconnect-evm-only)
3. [Standards CAIP pour Tron](#3-standards-caip-pour-tron)
4. [WalletConnect & Tron — Protocole officiel](#4-walletconnect--tron--protocole-officiel)
5. [Écosystème MetaMask — connect-tron & multichain-api-client](#5-écosystème-metamask--connect-tron--multichain-api-client)
6. [Top 5 des dApps Tron avec WalletConnect](#6-top-5-des-dapps-tron-avec-walletconnect)
7. [Analyse des écarts — Ce qui doit changer](#7-analyse-des-écarts--ce-qui-doit-changer)
8. [Roadmap d'implémentation](#8-roadmap-dimplémentation)

---

## 1. Résumé exécutif

MetaMask Mobile utilise **WalletConnect v2** (via `@reown/walletkit`) pour les connexions dApp. L'implémentation actuelle est strictement limitée aux chaînes EVM via le namespace `eip155`. Tron est une chaîne non-EVM avec son propre namespace CAIP-2 (`tron:`), ses propres méthodes JSON-RPC, et un format d'adresse distinct (Base58Check, préfixe `T`).

Il existe **deux voies d'intégration** dans l'écosystème MetaMask :

| Voie                            | Protocol                                  | Côté dApp                                | Côté MetaMask Mobile              |
| ------------------------------- | ----------------------------------------- | ---------------------------------------- | --------------------------------- |
| **A — WalletConnect Sign API**  | WC session_proposal avec namespace `tron` | `@walletconnect/sign-client`             | `WalletConnectV2.ts` (à modifier) |
| **B — MetaMask Multichain API** | `wallet_createSession` CAIP-25            | `connect-tron` + `multichain-api-client` | Engine CAIP-25 (à modifier)       |

Le repo `connect-tron` implémente la voie B. Ce document couvre les deux, avec focus sur la voie A (WalletConnect).

---

## 2. Architecture actuelle — WalletConnect EVM-only

### 2.1 Vue d'ensemble des fichiers clés

| Fichier                                           | Rôle                                                   |
| ------------------------------------------------- | ------------------------------------------------------ |
| `app/core/WalletConnect/WalletConnectV2.ts`       | Manager singleton — lifecycle des sessions WC          |
| `app/core/WalletConnect/WalletConnect2Session.ts` | Gestionnaire par session — routing des requêtes        |
| `app/core/WalletConnect/wc-utils.ts`              | Utilitaires chaîne/permission (`getScopedPermissions`) |
| `app/core/WalletConnect/wc-config.ts`             | Routing méthodes RPC → redirect ou non                 |
| `app/core/Permissions/index.ts`                   | CAIP-25 permission management (`getPermittedChains`)   |
| `app/core/BackgroundBridge/WalletConnectPort.ts`  | Bridge WC ↔ RPC middleware                            |

Packages principaux :

- `@reown/walletkit` v1.4.1 — successeur de WalletConnect v2 WalletKit
- `@walletconnect/core` v2.23.0
- `@metamask/chain-agnostic-permission` — builder CAIP-25

### 2.2 Flux de création de session

```mermaid
sequenceDiagram
    participant DApp
    participant WC_Relay as WC Relay Server
    participant WC2Manager as WC2Manager<br/>(WalletConnectV2.ts)
    participant Permissions as Permissions<br/>(index.ts)
    participant Engine as MetaMask Engine

    DApp->>WC_Relay: session_proposal { requiredNamespaces: { eip155: {...} } }
    WC_Relay->>WC2Manager: onSessionProposal(proposal)
    WC2Manager->>WC2Manager: getDefaultCaip25CaveatValue()<br/>→ { wallet:eip155 scope seulement }
    WC2Manager->>Permissions: requestPermissions(caip25 caveat)
    Permissions->>Engine: approvePermissionsRequest()
    Engine-->>Permissions: approved accounts + chains
    Permissions-->>WC2Manager: CAIP-25 permission granted
    WC2Manager->>WC2Manager: getScopedPermissions()<br/>→ { eip155: { chains, methods, accounts } }
    WC2Manager->>WC_Relay: approveSession({ namespaces: { eip155: {...} } })
    WC_Relay->>DApp: session_update (approved)
    WC2Manager->>WC2Manager: new WalletConnect2Session(topic, ...)
```

### 2.3 Flux de traitement d'une requête

```mermaid
sequenceDiagram
    participant DApp
    participant WC_Relay as WC Relay
    participant Session as WalletConnect2Session
    participant Bridge as WalletConnectPort<br/>(BackgroundBridge)
    participant RPC as RPC Middleware

    DApp->>WC_Relay: session_request { chainId: "eip155:1", method: "eth_sendTransaction" }
    WC_Relay->>Session: onSessionRequest(event)
    Session->>Session: handleRequest()<br/>→ extrait chainId CAIP (eip155:1)
    Session->>Session: getPermittedChains() → vérifie eip155
    alt wallet_switchEthereumChain
        Session->>Session: switchToChain(caip2ChainId)
        Session->>Session: handleChainChange() → updateSession()
        Session-->>WC_Relay: approveRequest(result: true)
    else autre méthode EVM
        Session->>Bridge: postMessage(rpc_request)
        Bridge->>RPC: getRpcMethodMiddleware()
        RPC-->>Bridge: result
        Bridge-->>Session: response
        Session-->>WC_Relay: respondSessionRequest(result)
    end
    WC_Relay->>DApp: response
```

### 2.4 Où est enforced la restriction EVM-only

```mermaid
flowchart TD
    A[session_proposal reçu] --> B[getDefaultCaip25CaveatValue]
    B --> C{"Scope initial\nwallet:eip155 seulement"}
    C --> D[requestPermissions caveat eip155]
    D --> E[getScopedPermissions]
    E --> F{"Retourne uniquement\neip155 key"}
    F --> G[approveSession namespaces eip155 only]
    G --> H[session active EVM uniquement]

    B -->|"NON-EVM namespace ignoré"| X[tron: scope jamais créé]
    E -->|"getPermittedEthChainIds() filtre non-EVM"| X

    style C fill:#ff6b6b,color:#fff
    style F fill:#ff6b6b,color:#fff
    style X fill:#ffd93d
```

**4 points de blocage identifiés :**

1. **`getDefaultCaip25CaveatValue()`** (`Permissions/index.ts:302`) — initialise uniquement `wallet:eip155`
2. **`getScopedPermissions()`** (`wc-utils.ts:255`) — ne retourne que la clé `eip155` dans le namespace object
3. **`getPermittedChains()`** (`Permissions/index.ts:632`) — appelle `getPermittedEthChainIds()` qui filtre non-EVM
4. **`handleRequest()`** (`WalletConnect2Session.ts:649`) — assume format `eip155:` uniquement

**Points d'extension existants (non utilisés par WC) :**

- `isNonEvmScopeSupported()` callback dans les caveat specifications
- `getNonEvmAccountAddresses()` callback pour les comptes non-EVM
- `MultichainNetworkController` présent dans Engine
- `parseCaipAccountId()` gère multi-namespace dans `addPermittedAccounts()`

---

## 3. Standards CAIP pour Tron

### 3.1 CAIP-2 — Chain IDs Tron

Le format CAIP-2 est : `namespace:reference` (max 64 chars, alphanumeric + hyphens)

| Réseau         | CAIP-2 Chain ID   | Chain ID Hex |
| -------------- | ----------------- | ------------ |
| Tron Mainnet   | `tron:728126428`  | `0x2b6653dc` |
| Nile Testnet   | `tron:3448148188` | `0xcd8690dc` |
| Shasta Testnet | `tron:2494104990` | `0x94a9059e` |

### 3.2 CAIP-10 — Format de compte Tron

```
tron:728126428:TKVDxNMaizfhFZEnPJGrgSCDp3GdLH4G6F
└─────────────────────────────────────────────────────┘
  namespace:chainId:address (Base58Check, préfixe 'T')
```

### 3.3 Comparaison avec EVM

```mermaid
graph LR
    subgraph EVM
        E1["CAIP-2: eip155:1"]
        E2["CAIP-10: eip155:1:0xabc..."]
        E3["Account format: 0x hex (20 bytes)"]
    end
    subgraph Tron
        T1["CAIP-2: tron:728126428"]
        T2["CAIP-10: tron:728126428:TAbc..."]
        T3["Account format: Base58Check (préfixe T)"]
    end
```

---

## 4. WalletConnect & Tron — Protocole officiel

### 4.1 Méthodes RPC Tron (Reown/WalletConnect)

Source : `docs.reown.com/advanced/multichain/rpc-reference/tron-rpc`

#### Méthodes requises

**`tron_signTransaction`** — Signe une transaction sans la broadcaster

```json
{
  "method": "tron_signTransaction",
  "params": {
    "address": "TKVDxNMaizfhFZEnPJGrgSCDp3GdLH4G6F",
    "transaction": {
      "txID": "abc123...",
      "raw_data": { ... },
      "raw_data_hex": "0a02..."
    }
  }
}
```

Réponse :

```json
{
  "txID": "abc123...",
  "signature": ["3045..."],
  "raw_data": { ... },
  "raw_data_hex": "0a02...",
  "visible": false
}
```

**`tron_signMessage`** — Signe un message personnel

```json
{
  "method": "tron_signMessage",
  "params": {
    "address": "TKVDxNMaizfhFZEnPJGrgSCDp3GdLH4G6F",
    "message": "Hello Tron"
  }
}
```

Réponse :

```json
{
  "signature": "0x..."
}
```

#### Méthodes optionnelles

**`tron_sendTransaction`** — Broadcast une transaction signée
**`tron_getBalance`** — Retourne le solde TRX en SUN (1 TRX = 1,000,000 SUN)

#### Session property importante

```json
{
  "sessionProperties": {
    "tron_method_version": "v1"
  }
}
```

> `v1` active la structure simplifiée de transaction (sans le nested `transaction.transaction` des implémentations legacy).

### 4.2 Format d'une session_proposal Tron (côté dApp)

```json
{
  "id": 1234567890,
  "params": {
    "id": 1234567890,
    "expiry": 1711980000,
    "relays": [{ "protocol": "irn" }],
    "proposer": {
      "publicKey": "abc...",
      "metadata": {
        "name": "SunSwap",
        "description": "Tron DEX",
        "url": "https://sun.io",
        "icons": ["https://sun.io/logo.png"]
      }
    },
    "requiredNamespaces": {
      "tron": {
        "chains": ["tron:728126428"],
        "methods": ["tron_signTransaction", "tron_signMessage"],
        "events": []
      }
    },
    "optionalNamespaces": {
      "tron": {
        "chains": ["tron:728126428", "tron:3448148188"],
        "methods": [
          "tron_signTransaction",
          "tron_signMessage",
          "tron_sendTransaction",
          "tron_getBalance"
        ],
        "events": []
      }
    }
  }
}
```

### 4.3 Format de la réponse wallet (session approval)

```json
{
  "topic": "abc...",
  "namespaces": {
    "tron": {
      "chains": ["tron:728126428"],
      "methods": ["tron_signTransaction", "tron_signMessage"],
      "events": [],
      "accounts": ["tron:728126428:TKVDxNMaizfhFZEnPJGrgSCDp3GdLH4G6F"]
    }
  },
  "sessionProperties": {
    "tron_method_version": "v1"
  }
}
```

### 4.4 Session multichain EVM + Tron (cas mixte)

```json
{
  "namespaces": {
    "eip155": {
      "chains": ["eip155:1", "eip155:137"],
      "methods": ["eth_sendTransaction", "personal_sign", "..."],
      "events": ["chainChanged", "accountsChanged"],
      "accounts": ["eip155:1:0xabc...", "eip155:137:0xabc..."]
    },
    "tron": {
      "chains": ["tron:728126428"],
      "methods": ["tron_signTransaction", "tron_signMessage"],
      "events": [],
      "accounts": ["tron:728126428:TKVDxNMaizfhFZEnPJGrgSCDp3GdLH4G6F"]
    }
  }
}
```

---

## 5. Écosystème MetaMask — connect-tron & multichain-api-client

### 5.1 Les deux voies d'intégration

```mermaid
graph TB
    subgraph "Côté dApp"
        DA1["dApp + @walletconnect/sign-client<br/>WC session_proposal tron namespace"]
        DA2["dApp + @metamask/connect-tron<br/>MetaMaskAdapter (TronWallet Adapter)"]
    end

    subgraph "Transport"
        T1["WalletConnect Relay Server<br/>(irn protocol)"]
        T2["Chrome: chrome.runtime.connect()<br/>Firefox: window.postMessage()"]
    end

    subgraph "MetaMask Mobile"
        MM1["WalletConnectV2.ts<br/>WC2Manager"]
        MM2["CAIP-25 Engine<br/>wallet_createSession / wallet_invokeMethod"]
        SIGN["Tron Signing Logic<br/>(à implémenter)"]
    end

    DA1 -->|"session_proposal"| T1
    T1 -->|"onSessionProposal"| MM1
    MM1 --> SIGN

    DA2 -->|"wallet_createSession<br/>{ tron:728126428 scope }"| T2
    T2 -->|"CAIP-25 request"| MM2
    MM2 --> SIGN

    style DA1 fill:#4ecdc4,color:#000
    style DA2 fill:#45b7d1,color:#000
    style SIGN fill:#ff6b6b,color:#fff
    style T1 fill:#f9f7f7
    style T2 fill:#f9f7f7
```

### 5.2 Architecture de connect-tron

**Package** : `@metamask/connect-tron` v0.3.1

```mermaid
classDiagram
    class MetaMaskAdapter {
        +_client: MultichainApiClient
        +_address: TronAddress
        +_scope: Scope
        +connect(scope?) Promise~TronAddress~
        +disconnect() Promise~void~
        +signMessage(message) Promise~string~
        +signTransaction(transaction) Promise~SignedTx~
        +switchChain(hexChainId) Promise~void~
    }

    class MultichainApiClient {
        +createSession(params) Promise~SessionData~
        +getSession() Promise~SessionData~
        +revokeSession(params?) Promise~void~
        +invokeMethod(params) Promise~Result~
        +onNotification(callback) unsubscribe
    }

    class Scope {
        MAINNET = "tron:728126428"
        SHASTA = "tron:2494104990"
        NILE = "tron:3448148188"
    }

    MetaMaskAdapter --> MultichainApiClient : uses
    MetaMaskAdapter --> Scope : references
```

### 5.3 Flux wallet_invokeMethod pour Tron (voie B)

```mermaid
sequenceDiagram
    participant DApp
    participant Adapter as MetaMaskAdapter<br/>(connect-tron)
    participant Client as MultichainApiClient
    participant Transport as Chrome/Firefox Transport
    participant Mobile as MetaMask Mobile<br/>(CAIP-25 Engine)

    DApp->>Adapter: signTransaction(rawTx)
    Adapter->>Client: invokeMethod({ scope: "tron:728126428",<br/>request: { method: "signTransaction",<br/>params: { address, transaction: { rawDataHex, type } } } })
    Client->>Transport: { method: "wallet_invokeMethod", params: {...} }
    Transport->>Mobile: CAIP-25 wallet_invokeMethod
    Mobile->>Mobile: Route to Tron signing logic
    Mobile-->>Transport: { signature: "0x..." }
    Transport-->>Client: response
    Client-->>Adapter: { signature: "0x..." }
    Adapter-->>DApp: signedTransaction
```

### 5.4 Paramètres de signing Tron (multichain-api-client)

Les types sont définis dans `src/types/scopes/tron.types.ts` :

```typescript
type TronAddress = `T${string}`; // Base58Check
type Base64Message = string;
type Signature = `0x${string}`;

// signTransaction
type SignTransactionParams = {
  address: TronAddress;
  transaction: {
    rawDataHex: string; // hex de raw_data_hex
    type: string; // e.g. "TransferContract"
  };
};

// signMessage
type SignMessageParams = {
  address: TronAddress;
  message: Base64Message; // message encodé en base64
};
```

> **Différence importante** : La voie WalletConnect (A) utilise les méthodes préfixées `tron_signTransaction`, `tron_signMessage`. La voie Multichain API (B) utilise `signTransaction`, `signMessage` sans préfixe (le namespace `tron:` est déjà dans le scope).

---

## 6. Top 5 des dApps Tron avec WalletConnect

Tron a un TVL total de **~$4.04 milliards** (DeFiLlama, mars 2026).

| #   | dApp                    | URL          | Catégorie        | TVL / Taille     | WC Support       | Notes                                                               |
| --- | ----------------------- | ------------ | ---------------- | ---------------- | ---------------- | ------------------------------------------------------------------- |
| 1   | **SunSwap / SUN.io**    | sun.io       | DEX + Yield      | ~$400M liquidity | Confirmé (WC v2) | Mentionne WalletConnect dans son UI wallet modal                    |
| 2   | **JustLend**            | justlend.org | Lending          | **$3.3B TVL**    | Probable (WC v2) | Plus grand protocole DeFi Tron, intègre TronLink + wallets externes |
| 3   | **JUST Stables**        | just.network | CDP / Stablecoin | $2.29B TVL       | Probable         | USDJ stablecoin, protocole JUST de la fondation Tron                |
| 4   | **Klever Exchange**     | klever.io    | DEX + Wallet     | ~$100M vol/j     | Confirmé (WC v2) | Klever Wallet supporte WC, DEX Tron actif                           |
| 5   | **HTX DeFi (ex-Huobi)** | htx.com      | CEX + DeFi       | $5.5B TVL total  | Probable         | HTX Eco Chain + Tron, WC pour connexion wallet                      |

> **Note** : La vérification directe via WebFetch a été limitée par les blocages 403/404. Les informations ci-dessus combinent les données DeFiLlama (TVL), la documentation Reown, et les connaissances publiques sur ces protocoles.

### 6.1 Patterns communs d'intégration WalletConnect côté dApp Tron

```mermaid
graph LR
    subgraph "Stack typique dApp Tron + WC"
        A["TronWeb"] --> B["@tronweb3/tronwallet-abstract-adapter"]
        B --> C["MetaMaskAdapter ou TronLinkAdapter"]
        C --> D{Wallet type}
        D -->|"MetaMask"| E["connect-tron\n→ Multichain API"]
        D -->|"WalletConnect"| F["@walletconnect/sign-client\nnamespace: tron"]
        D -->|"TronLink"| G["TronLink extension\nwindow.tronWeb"]
    end
```

**Méthodes WalletConnect les plus demandées par les dApps Tron :**

1. `tron_signTransaction` — universellement requis (toutes transactions DeFi)
2. `tron_signMessage` — authentification, signatures EIP-712 équivalentes
3. `tron_sendTransaction` — optionnel (certains dApps préfèrent que le wallet broadcast)
4. `tron_getBalance` — souvent géré via API Tron directement plutôt que WC

**Session property systématiquement incluse** : `tron_method_version: v1`

---

## 7. Analyse des écarts — Ce qui doit changer

### 7.1 Vue d'ensemble des changements requis

```mermaid
graph TB
    subgraph "Voie A — WalletConnect Sign API"
        WCV2["WalletConnectV2.ts<br/>onSessionProposal()"]
        WCUTIL["wc-utils.ts<br/>getScopedPermissions()"]
        WCSESS["WalletConnect2Session.ts<br/>handleRequest()"]
        WCCFG["wc-config.ts<br/>Tron method routing"]
    end

    subgraph "Voie B — MetaMask Multichain API"
        PERM["Permissions/index.ts<br/>getDefaultCaip25CaveatValue()"]
        CHAIN["Permissions/index.ts<br/>getPermittedChains()"]
    end

    subgraph "Nouveau code à créer"
        TSIGN["TronSigningModule<br/>signTransaction / signMessage"]
        TACCOUNT["TronAccountManager<br/>dérive adresse Tron depuis seed"]
        TBRIDGE["TronBridge<br/>routes tron_* methods"]
    end

    WCV2 -->|"1. Accepter namespace tron"| TSIGN
    WCUTIL -->|"2. Inclure tron scope dans namespaces"| TSIGN
    WCSESS -->|"3. Router tron_* vers TronBridge"| TBRIDGE
    WCCFG -->|"4. Ajouter méthodes Tron"| TBRIDGE
    PERM -->|"5. Permettre wallet:tron scope"| TSIGN
    CHAIN -->|"6. Extraire chaînes Tron"| TACCOUNT
    TBRIDGE --> TSIGN
    TSIGN --> TACCOUNT

    style TSIGN fill:#ff6b6b,color:#fff
    style TACCOUNT fill:#ff6b6b,color:#fff
    style TBRIDGE fill:#ff6b6b,color:#fff
```

### 7.2 Détail des modifications par fichier

#### `app/core/WalletConnect/WalletConnectV2.ts`

**Problème** : `onSessionProposal()` ne traite que `eip155`, ignore `tron`

**Changements** :

```
1. Détecter la présence du namespace "tron" dans requiredNamespaces/optionalNamespaces
2. Si tron présent : récupérer le compte Tron actif (via MultichainNetworkController)
3. Construire le namespace tron dans la réponse d'approbation :
   { tron: { chains, methods, events: [], accounts: ["tron:728126428:TAddress..."] } }
4. Gérer sessionProperties { tron_method_version: "v1" } dans approveSession
```

#### `app/core/WalletConnect/wc-utils.ts`

**Problème** : `getScopedPermissions()` ne retourne que `eip155`

**Changements** :

```
1. Appeler getNonEvmAccountAddresses() pour récupérer les comptes Tron
2. Si comptes Tron disponibles, construire le scope tron :
   {
     chains: ["tron:728126428"],
     methods: TRON_METHODS,
     events: [],
     accounts: ["tron:728126428:TAddress..."]
   }
3. Merger avec le scope eip155 existant
```

#### `app/core/WalletConnect/WalletConnect2Session.ts`

**Problème** : `handleRequest()` assume `eip155:` format pour tous les chainId

**Changements** :

```
1. Parser le namespace depuis request.params.chainId (avant le ":")
2. Si namespace === "tron" : router vers TronRequestHandler (nouveau module)
3. TronRequestHandler gère :
   - tron_signTransaction → appel Tron signing
   - tron_signMessage → appel Tron message signing
   - tron_sendTransaction → broadcast via TronWeb
   - tron_getBalance → requête balance
4. Adapter updateSession() pour inclure le namespace tron si actif
```

#### `app/core/WalletConnect/wc-config.ts`

**Changements** :

```typescript
// Ajouter méthodes Tron qui nécessitent redirect vers l'app
export const TRON_SIGNING_METHODS = [
  'tron_signTransaction',
  'tron_signMessage',
  'tron_sendTransaction',
];
```

#### `app/core/Permissions/index.ts`

**Changements** :

```
1. getDefaultCaip25CaveatValue() : ne pas bloquer les scopes tron si présents
2. getPermittedChains() : étendre pour extraire aussi les chaînes Tron depuis le caveat
   (actuellement appelle seulement getPermittedEthChainIds())
```

#### Nouveau module à créer

```
app/core/Tron/
├── TronSigningModule.ts     # signTransaction, signMessage avec clé privée Tron
├── TronAccountManager.ts    # dérivation adresse Tron depuis seed MetaMask
├── TronRequestHandler.ts    # router les requêtes WC tron_* methods
└── tron-utils.ts            # conversions hex↔CAIP, validation adresse
```

### 7.3 Flux cible après implémentation

```mermaid
sequenceDiagram
    participant DApp as DApp Tron<br/>(SunSwap)
    participant WC_Relay as WC Relay
    participant WC2Manager as WC2Manager
    participant TronAccount as TronAccountManager
    participant Session as WalletConnect2Session
    participant TronHandler as TronRequestHandler
    participant Signing as TronSigningModule

    DApp->>WC_Relay: session_proposal { tron: { chains: ["tron:728126428"] } }
    WC_Relay->>WC2Manager: onSessionProposal
    WC2Manager->>TronAccount: getActiveTronAddress()
    TronAccount-->>WC2Manager: "TKVDxNMaizfhFZEnPJGrgSCDp3GdLH4G6F"
    WC2Manager->>WC_Relay: approveSession({ namespaces: { eip155: {...}, tron: { accounts: ["tron:728126428:TKVDx..."] } } })
    WC_Relay->>DApp: session_approve

    DApp->>WC_Relay: session_request { chainId: "tron:728126428", method: "tron_signTransaction" }
    WC_Relay->>Session: onSessionRequest
    Session->>Session: parseNamespace("tron:728126428") → "tron"
    Session->>TronHandler: handleTronRequest(method, params)
    TronHandler->>Signing: signTransaction(rawDataHex, address)
    Signing-->>TronHandler: { signature: "0x..." }
    TronHandler-->>Session: result
    Session->>WC_Relay: respondSessionRequest(result)
    WC_Relay->>DApp: signature
```

---

## 8. Roadmap d'implémentation

### Phase 1 — Foundation (Prerequis)

```mermaid
gantt
    title Roadmap Tron WalletConnect
    dateFormat YYYY-MM-DD
    section Phase 1: Foundation
    TronAccountManager (dérivation seed)         :p1a, 2026-04-01, 14d
    TronSigningModule (signTx, signMsg)           :p1b, after p1a, 10d
    Tests unitaires signing                       :p1c, after p1b, 7d
    section Phase 2: WalletConnect Integration
    wc-utils.ts — tron scope dans namespaces      :p2a, after p1c, 5d
    WalletConnectV2.ts — onSessionProposal tron   :p2b, after p2a, 7d
    WalletConnect2Session.ts — tron routing       :p2c, after p2b, 7d
    TronRequestHandler                            :p2d, after p2c, 5d
    section Phase 3: Multichain API
    Permissions — wallet:tron scope               :p3a, after p2d, 7d
    wallet_invokeMethod tron methods              :p3b, after p3a, 7d
    section Phase 4: UI & Tests E2E
    UI — sélection compte Tron dans WC modal      :p4a, after p3b, 10d
    Tests E2E avec SunSwap / JustLend             :p4b, after p4a, 14d
```

### Ordre de priorité des tâches

| Priorité | Tâche                                                                      | Fichier(s) | Effort |
| -------- | -------------------------------------------------------------------------- | ---------- | ------ |
| P0       | `TronAccountManager` — dérivation adresse Tron depuis seed MetaMask        | nouveau    | M      |
| P0       | `TronSigningModule` — signature transaction/message                        | nouveau    | L      |
| P1       | `WalletConnectV2.ts` — accepter namespace tron dans `onSessionProposal`    | existant   | M      |
| P1       | `wc-utils.ts` — `getScopedPermissions()` inclure scope tron                | existant   | S      |
| P1       | `WalletConnect2Session.ts` — router `tron_*` vers `TronRequestHandler`     | existant   | M      |
| P2       | `TronRequestHandler` — dispatch `tron_signTransaction`, `tron_signMessage` | nouveau    | M      |
| P2       | `Permissions/index.ts` — `getPermittedChains()` inclure Tron               | existant   | S      |
| P3       | `wallet_invokeMethod` Tron dans le CAIP-25 Engine (voie B)                 | existant   | L      |
| P4       | UI WalletConnect modal — afficher compte Tron                              | existant   | M      |

### Points d'attention critiques

1. **Dérivation de clé Tron** : Tron utilise le même algorithme ECDSA secp256k1 qu'Ethereum mais avec une adresse en Base58Check (préfixe `T`). La clé privée est identique — seul le format d'adresse diffère. Ceci simplifie la dérivation depuis le seed MetaMask existant.

2. **TronWeb dependency** : Il faudra évaluer si on intègre `tronweb` (heavy, ~2MB) ou si on implémente le minimum en utilisant directement `viem`/`noble-secp256k1` + la logique Base58Check Tron.

3. **Warmup retry** : Le `multichain-api-client` inclut déjà un workaround pour l'issue MetaMask Mobile #16550 (`wallet_getSession` ne répond pas au chargement de page). Ce bug doit être résolu avant ou en parallèle.

4. **Session property `tron_method_version: v1`** : À envoyer systématiquement dans la réponse d'approbation pour éviter le format legacy `transaction.transaction` des dApps anciennes.

5. **Accounts UI** : MetaMask n'affiche pas actuellement de compte "Tron" dans son UI. La dérivation doit s'appuyer sur le compte EVM actif (même seed, même index HD) pour éviter la confusion UX.

---

## Références

- `app/core/WalletConnect/WalletConnectV2.ts` — Manager WC2
- `app/core/WalletConnect/WalletConnect2Session.ts` — Session handler
- `app/core/WalletConnect/wc-utils.ts:255` — `getScopedPermissions()`
- `app/core/Permissions/index.ts:302` — `getDefaultCaip25CaveatValue()`
- `app/core/Permissions/index.ts:632` — `getPermittedChains()`
- [`@metamask/connect-tron`](https://github.com/MetaMask/connect-tron) v0.3.1
- [`@metamask/multichain-api-client`](https://github.com/MetaMask/multichain-api-client) v0.11.0
- [Reown Tron RPC Reference](https://docs.reown.com/advanced/multichain/rpc-reference/tron-rpc)
- [CAIP-2 Specification](https://standards.chainagnostic.org/CAIPs/caip-2)
- MetaMask Mobile issue [#16550](https://github.com/MetaMask/metamask-mobile/issues/16550) — multichain API warmup bug
