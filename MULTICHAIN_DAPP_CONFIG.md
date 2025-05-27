# Multichain Test DApp Configuration

This document explains how to configure the multichain test dapp URL for E2E testing.

## 🎯 **Overview**

The multichain E2E tests can connect to different dapp instances based on your development needs:
- **Custom URL**: Any remote or local dapp instance
- **Local Development**: Local development server
- **Required Configuration**: No hardcoded URLs - must be explicitly configured

## 🔧 **Configuration Options**

### **Option 1: Official MetaMask Test Dapp (Recommended)**
Use the official MetaMask multichain test dapp:

```bash
# Official MetaMask test dapp (recommended)
export MULTICHAIN_DAPP_URL="https://metamask.github.io/test-dapp-multichain/latest/"

# Run tests with official dapp
MULTICHAIN_DAPP_URL="https://metamask.github.io/test-dapp-multichain/latest/" MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts
```

### **Option 2: Custom URL**
Set the `MULTICHAIN_DAPP_URL` environment variable to any custom URL:

```bash
# Custom remote instance
export MULTICHAIN_DAPP_URL="https://my-custom-dapp.example.com/"

# Local custom port
export MULTICHAIN_DAPP_URL="http://localhost:3000/"

# Run tests with custom URL
MULTICHAIN_DAPP_URL="https://my-custom-dapp.example.com/" MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts
```

### **Option 3: Local Development Server**
Set `USE_LOCAL_DAPP=true` to use the local development server:

```bash
# Use local development server
export USE_LOCAL_DAPP=true

# Run tests with local dapp
USE_LOCAL_DAPP=true MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts
```

### **Option 4: Environment File Configuration**
Configure the URL in your `.e2e.env` file:

```bash
# .e2e.env file (uses official MetaMask dapp by default)
export MULTICHAIN_DAPP_URL="https://metamask.github.io/test-dapp-multichain/latest/"

# Run tests (will use URL from .e2e.env)
source .e2e.env && MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts
```

## 🚀 **Usage Examples**

### **Development Workflow**
```bash
# 1. Start your local dapp development server
cd test-dapp-multichain
npm start  # Runs on http://localhost:3000

# 2. Run tests against your local dapp
USE_LOCAL_DAPP=true MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts
```

### **Official MetaMask Testing**
```bash
# Test against the official MetaMask test dapp
MULTICHAIN_DAPP_URL="https://metamask.github.io/test-dapp-multichain/latest/" MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/
```

### **Custom Remote Testing**
```bash
# Test against a specific deployment
MULTICHAIN_DAPP_URL="https://staging-dapp.metamask.io/" MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/
```

### **CI/CD Integration**
```bash
# In your CI environment (use official MetaMask dapp)
export MULTICHAIN_DAPP_URL="https://metamask.github.io/test-dapp-multichain/latest/"
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/
```

## 🔍 **URL Resolution Priority**

The system resolves the dapp URL in this order:

1. **`MULTICHAIN_DAPP_URL`** - Custom URL (highest priority)
2. **`USE_LOCAL_DAPP=true`** - Local development server
3. **Error** - No configuration found (prevents accidental usage)

## 📝 **Environment File Setup**

You can also set these in your `.env` file:

```bash
# .env file
# Option 1: Official MetaMask test dapp (recommended)
MULTICHAIN_DAPP_URL=https://metamask.github.io/test-dapp-multichain/latest/
# Option 2: Custom URL
MULTICHAIN_DAPP_URL=http://localhost:3000/
# Option 3: Local development server
USE_LOCAL_DAPP=true
```

## 🛠️ **Development Benefits**

This configuration system enables:

- **🔄 Rapid Development**: Test against local dapp changes instantly
- **🌐 Remote Testing**: Test against any deployed dapp instance  
- **🚀 CI/CD Flexibility**: Different URLs for different environments
- **🔧 Debugging**: Easy switching between dapp versions
- **👥 Team Collaboration**: Each developer can use their preferred setup

## 🚨 **Important Notes**

- **URL Format**: Ensure URLs end with `/` for proper path resolution
- **CORS**: Local dapps must allow cross-origin requests from the mobile app
- **Network Access**: Ensure the mobile simulator/device can reach the specified URL
- **SSL**: Use HTTPS URLs for production testing

## 📊 **Logging**

The system logs which URL is being used:

```
🌐 Using custom multichain dapp URL: https://metamask.github.io/test-dapp-multichain/latest/
🏠 Using local multichain dapp URL: http://localhost:8080/
❌ No multichain dapp URL configured! Please set MULTICHAIN_DAPP_URL or USE_LOCAL_DAPP=true
```

This helps debug URL resolution issues during test execution. 