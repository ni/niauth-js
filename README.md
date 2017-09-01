# NI Auth JavaScript Client

This is a JavaScript implementation of a client library for "NI Auth",
the authentication system used for [NI LabVIEW Real-Time][1] targets and
[LabVIEW-based web services][2].

This implementation was designed for use in the browser, and utilizes
both [Promises][3] and the [Fetch API][4]. For downlevel browsers, consider
using the `es6-promise` and `fetch-ie8` npm packages to provide these.

## Status

This project has enough implementation to log in to a NI LabVIEW Real-Time
2016 system and enumerate permission roles. More complicated use cases,
such as adding or removing users or roles, are not presently supported.

The API should not be considered to be stable.

## Development

See CONTRIBUTING.md.

## Support

niauth-js is not supported by National Instruments. All support should be
through the project's GitHub page.

## Licensing

niauth-js is licensed under an MIT-style license (see LICENSE). Other
incorporated projects may be licensed under different licenses. All licenses
allow for non-commercial and commercial use.

[1]: http://www.ni.com/labview/realtime/
[2]: http://www.ni.com/white-paper/7747/en/
[3]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
