# Vendored packages (temporary)

## `metamask-toprf-secure-backup-1.1.0-local.tgz`

Local pack of `@metamask/toprf-secure-backup` from the Web3Auth `toprf-secure-backup`
checkout (includes unreleased envelope / wrap-key support from
[MetaMask/toprf-secure-backup#167](https://github.com/MetaMask/toprf-secure-backup/pull/167)).

**Why:** CI / branch builds cannot use `portal:../toprf-secure-backup`. npm
`@metamask/toprf-secure-backup@1.1.0` does not yet include the envelope APIs
needed for passwordless recovery flows.

**Remove** this tarball and switch resolutions back to the published npm (or a
real preview) once that package is published.
