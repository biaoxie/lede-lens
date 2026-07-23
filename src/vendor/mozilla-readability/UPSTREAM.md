# Mozilla Readability

This directory contains the browser-ready `Readability.js` file from
`@mozilla/readability` version `0.6.0`.

- Upstream: <https://github.com/mozilla/readability>
- npm package: <https://www.npmjs.com/package/@mozilla/readability>
- License: Apache License 2.0; see `LICENSE.md`

The npm dependency remains in `package.json` to record provenance and make
updates auditable. When updating it:

1. update the npm dependency and lockfile;
2. copy `Readability.js` and `LICENSE.md` from the installed package here;
3. update the version in this file;
4. run `npm run release:check`;
5. manually test article extraction before release.
