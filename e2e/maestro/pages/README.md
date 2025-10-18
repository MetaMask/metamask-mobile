# Maestro Page Objects

This directory contains Page Object Model (POM) files following [Maestro's Page Object Model pattern](https://docs.maestro.dev/examples/page-object-model).

## Structure

```
pages/
├── onboarding.js            # Onboarding and wallet creation screens
├── home.js                  # Home/wallet screen and account management
├── add-wallet.js            # Add wallet and Import Secret Recovery Phrase screens
├── browser.js               # Browser tab and connection modal elements
├── multichain-test-dapp.js  # Multichain test dApp elements
├── loadElements.yaml        # Loads all page objects (use this in your flows)
└── README.md                # This file
```

## Usage

### In Test Files

Add this line at the beginning of your test flow to load all page objects:

```yaml
- runFlow: ../pages/loadElements.yaml
```

### Accessing Elements

Use the `${output.screenName.elementName}` syntax to reference elements:

```yaml
# Example: Tap on account picker
- tapOn:
    id: ${output.home.accountPicker}

# Example: Assert text is visible
- assertVisible: ${output.onboarding.welcome.text}

# Example: Input into a field
- tapOn:
    id: ${output.importSRP.word1}
- inputText: club

# Example: Browser tab navigation
- tapOn:
    id: ${output.browser.tabBar.browserTab}
```

## Page Objects

### onboarding.js

Elements for the onboarding flow organized by screen:

- **`welcome`** - Welcome screen elements
- **`createPassword`** - Password creation screen elements
- **`backup`** - Backup/security modal elements
- **`metrics`** - MetaMetrics opt-in screen elements
- **`default_settings`** - Default settings screen elements (includes "remind later" message and done button)
- **`perps`** - Perps modal elements

**Example:**

```yaml
# Welcome screen
- assertVisible: ${output.onboarding.welcome.text}
- tapOn:
    id: ${output.onboarding.welcome.createNewWalletBtn}

# Create password screen
- assertVisible: ${output.onboarding.createPassword.title}
- tapOn:
    id: ${output.onboarding.createPassword.firstPasswordInput}

# Backup screen
- tapOn:
    id: ${output.onboarding.backup.remindMeLaterBtn}

# Default settings screen
- assertVisible: ${output.onboarding.default_settings.remindLaterMessage}
- tapOn:
    id: ${output.onboarding.default_settings.doneBtn}
```

### home.js

Elements for the home/wallet screen and account management:

- Account picker
- Account list
- Add account modal

**Example:**

```yaml
- tapOn:
    id: ${output.home.accountPicker}
- tapOn:
    id: ${output.home.addAccountBtn}
```

### add-wallet.js

Elements for importing a Secret Recovery Phrase:

- Screen title
- 12 SRP word input fields
- Continue button
- Helper function to get word inputs by index

**Example:**

```yaml
- assertVisible: ${output.importSRP.screenTitle}
- tapOn:
    id: ${output.importSRP.word1}
- inputText: club
```

### browser.js

Elements for browser tab and MetaMask connection modal:

- **`tabBar`** - Tab bar elements for navigation
- **`screen`** - Browser screen elements (default URL)
- **`connectionModal`** - MetaMask connection modal elements

**Example:**

```yaml
# Navigate to browser tab
- tapOn:
    id: ${output.browser.tabBar.browserTab}

# Use connection modal
- assertVisible: ${output.browser.connectionModal.title}
- tapOn:
    id: ${output.browser.connectionModal.connectBtn}
```

### multichain-test-dapp.js

Elements for MetaMask Multichain Test dApp:

- **`url`** - Test dApp URL
- **`autoConnectBtn`** - Auto-connect button
- **`createSessionBtn`** - Create session button
- **`networks`** - Network checkbox elements
  - `ethereum` - Ethereum network checkbox
  - `linea` - Linea network checkbox
  - `solana` - Solana network checkbox

**Example:**

```yaml
# Navigate to test dApp
- inputText: ${output.testDapp.url}

# Select networks
- tapOn:
    id: ${output.testDapp.networks.ethereum}
- tapOn:
    id: ${output.testDapp.networks.solana}

# Connect dApp
- tapOn:
    id: ${output.testDapp.autoConnectBtn}
- tapOn:
    id: ${output.testDapp.createSessionBtn}
```

## Benefits

✅ **Single source of truth** - Update an element ID in one place  
✅ **Better readability** - Descriptive names instead of IDs  
✅ **Easier maintenance** - When IDs change, update only the page object  
✅ **Reduced duplication** - Reuse elements across multiple flows  
✅ **Better organization** - Elements grouped by screen/functionality

## Adding New Page Objects

1. Create a new `.js` file in this directory
2. Follow the pattern:

   ```javascript
   // screenName.js
   // Page Object for [screen description]

   /* global output */

   output.screenName = {
     elementName: 'element-id',
     anotherElement: 'another-id',
   };
   ```

3. Add the file to `loadElements.yaml`:
   ```yaml
   # Current structure:
   - runScript: onboarding.js
   - runScript: home.js
   - runScript: add-wallet.js
   - runScript: browser.js
   - runScript: multichain-test-dapp.js
   - runScript: screenName.js # Add your new file here
   ```

## Cross-Platform Support

To support different element IDs for Android and iOS, use conditional flows:

```yaml
- runFlow:
    when:
      platform: Android
    commands:
      - runScript:
          file: android/home.js
- runFlow:
    when:
      platform: iOS
    commands:
      - runScript:
          file: iOS/home.js
```
