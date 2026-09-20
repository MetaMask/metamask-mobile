# Send use-case matrix

| Flow                                                             | Primary layer       | Coverage                              |
| ---------------------------------------------------------------- | ------------------- | ------------------------------------- |
| Testnet fiat preference controls prices in the send asset picker | Integration Shape C | `asset.integration.test.tsx`          |
| Token filtering, sorting, and conversion edge cases              | Unit                | Send hook unit suites                 |
| Token-row visual and interaction variants                        | Component/unit      | Token and token-list component suites |
| Native navigation, keyboard, and signing behavior                | E2E                 | Appium send specs                     |
