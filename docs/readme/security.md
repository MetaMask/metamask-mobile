# Security

This document provides base guidance for security-sensitive code in MetaMask Mobile. It can be extended with more context over time (e.g. threat model, review process, specific flows).

## Principles

- **Sensitive data** is encrypted via **SecureKeychain**; keyring storage uses **vault** encryption.
- **Hardware wallet** support (Ledger, Keystone) — follow existing patterns for signing and key handling.
- **Never log** sensitive information: seeds, private keys, credentials, or data that could compromise user funds.
- Follow **OWASP** and project security practices.

## References

- [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) — security guidance and contribution practices.
- When adding or changing security-sensitive code, consider internal review and existing patterns in the codebase.
