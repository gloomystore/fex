# 📜 Changelog

All notable changes will be documented in this file.

## [1.0.0] - 2025-03-06
### 🎉 Added
- Initial release of `fexjs`.
- Support for `GET`, `POST`, `OPTIONS` requests.
- Interceptors for request & response.
- Cancel tokens for request cancellation.
- Timeout support.

## [1.0.5] - 2025-03-07
### 🔧 Improved
- Enhanced TypeScript typings for stricter type safety.
- Improved error handling for response interceptors.

### 🐛 Fixed
- `https` module is now only used in Node.js environments to prevent browser-related issues.
- Ensured `withCredentials` and `mode` options cannot be used together to avoid conflicts.

## [1.0.8] - 2025-03-07
### 🐛 Fixed
- removed `https` module and `NODE_TLS_REJECT_UNAUTHORIZED ` settings

## [1.0.9] - 2025-03-26
### 🐛 Fixed
- added FexError type.


<!-- ## [1.0.1] - YYYY-MM-DD
### 🐛 Fixed
- Fixed bug with timeout handling in `fetch`.
- Improved TypeScript types for better autocomplete.

## [1.1.0] - YYYY-MM-DD
### 🚀 Changed
- Added support for custom headers.
- Enhanced logging for debugging. -->