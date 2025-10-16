# Maestro Page Objects

This directory contains Page Object Model (POM) files following [Maestro's Page Object Model pattern](https://docs.maestro.dev/examples/page-object-model).

## Structure

```
pages/
├── onboarding.js      # Onboarding and wallet creation screens
├── wallet.js          # Wallet and account management screens
├── importSRP.js       # Import Secret Recovery Phrase screens
├── loadElements.yaml  # Loads all page objects (use this in your flows)
└── README.md          # This file
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
    id: ${output.wallet.accountPicker}

# Example: Assert text is visible
- assertVisible: ${output.onboarding.welcome.text}

# Example: Input into a field
- tapOn:
    id: ${output.importSRP.word1}
- inputText: club
```

## Page Objects

### onboarding.js

Elements for the onboarding flow organized by screen:

- **`welcome`** - Welcome screen elements
- **`createPassword`** - Password creation screen elements
- **`backup`** - Backup/security screen elements
- **`metrics`** - Metrics opt-in screen elements
- **`success`** - Success screen elements
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
```

### wallet.js

Elements for wallet and account management:

- Account picker
- Account list
- Add account modal

**Example:**

```yaml
- tapOn:
    id: ${output.wallet.accountPicker}
- tapOn:
    id: ${output.wallet.addAccountBtn}
```

### importSRP.js

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
   output.screenName = {
     elementName: 'element-id',
     anotherElement: 'another-id',
   };
   ```
3. Add the file to `loadElements.yaml`:
   ```yaml
   - runScript: screenName.js
   ```

## Cross-Platform Support

To support different element IDs for Android and iOS, use conditional flows:

```yaml
- runFlow:
    when:
      platform: Android
    commands:
      - runScript:
          file: android/wallet.js
- runFlow:
    when:
      platform: iOS
    commands:
      - runScript:
          file: iOS/wallet.js
```
