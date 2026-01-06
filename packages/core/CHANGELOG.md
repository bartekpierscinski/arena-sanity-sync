# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-01-06

### Added
- CLI tool for running syncs from the command line (`npx arena-sanity-core`)
- Deployment strategies documentation with timeout reference

## [0.2.1] - 2026-01-06

### Fixed
- Updated README documentation

## [0.2.0] - 2026-01-06

### Added
- Export `createSanityClient` helper function from main entry point
- Export `createArenaClient` helper function (requires optional `are.na` peer dependency)
- Added `"type": "module"` for proper ESM support
- Added npm metadata: repository, homepage, bugs, keywords
- Added `engines` field requiring Node.js >= 18

### Changed
- Moved `@sanity/client` from dependencies to peerDependencies
- Made `are.na` an optional peer dependency for `createArenaClient`

### Fixed
- Browser compatibility: replaced `Buffer.from()` with `btoa()` in `computeFingerprint`
- Removed duplicate `SanityAssetRef` type definition

## [0.1.1] - 2024-XX-XX

### Fixed
- Initial patch release

## [0.1.0] - 2024-XX-XX

### Added
- Initial release of arena-sanity-core
- Core sync engine for Are.na to Sanity synchronization
- Idempotent updates using fingerprinting
- Image upload modes: off, auto, on
- Drift detection for orphaned blocks
- Field protection (only updates arena* fields)
- Retry and backoff mechanisms
