# Daily Priorities - Multichain E2E Testing

**Yesterday:**
• ✅ Completed wallet_createSession, wallet_getSession, and wallet_revokeSession E2E tests
• ✅ Fixed dapp selector issues with escaped HTML IDs (colons → dashes)  
• ✅ Implemented comprehensive test utilities and session validation
• ✅ Documented working test commands and patterns
• 🔄 Started wallet_invokeMethod tests - got to method selection modal

**Today:**
• 🚧 Debug method selection modal interaction for wallet_invokeMethod tests
• 🔍 Investigate alternative selectors for modal elements (CSS/XPath approaches)
• 📋 Complete wallet_invokeMethod test validation once modal issue resolved

**Blockers/Reviews Requested:**
• ❌ **Method Selection Modal**: Can't select methods from invoke modal using `by.web.text()` selectors
• ❌ **Linea Network Issue**: eip155:59144 consistently filtered out from sessions (affects multi-chain tests)
