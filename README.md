[![Badge NPM]][NPM]

## Structured-Cloneable to Unicode-Only serializer/deserializer

Serialize/deserialize arbitrary JS data to/from well-formed Unicode strings.

The browser does not expose an API to serialize structured-cloneable types
into a single string. JSON.stringify() does not support complex JavaScript
objects, and does not support references to composite types. Unless the
data to serialize is only JS strings, it is difficult to easily switch
from one type of storage to another.

Serializing to a well-formed Unicode string allows to store structured-
cloneable data to any storage. Not all storages support storing binary data,
but all storages support storing Unicode strings.

Structured-cloneable types:
https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types

Data types      | String           | JSONable         | structured-cloneable
--------------- | ---------------- | ---------------- | ---------------------
document.cookie | Yes              | No               | No
localStorage    | Yes              | No               | No
IndexedDB       | Yes              | Yes              | Yes
browser.storage | Yes              | Yes              | No
Cache API       | Yes              | No               | No

The above table shows that only JS strings can be persisted natively to all
types of storage. The purpose of this library is to convert
structure-cloneable data (which is a superset of JSONable data) into a
single JS string. The resulting string is meant to be as small as possible.
As a result, it is not human-readable, though it contains only printable
ASCII characters -- and possibly Unicode characters beyond ASCII.

The resulting JS string will not contain characters which require escaping
should it be converted to a JSON value. However it may contain characters
which require escaping should it be converted to a URI component.

Characteristics:

- Serializes/deserializes data to/from a single well-formed Unicode string
- Strings do not require escaping, i.e. they are stored as-is
- Supports multiple references to same object
- Supports reference cycles
- Supports synchronous and asynchronous API
- Optionally supports LZ4 compression

### Usage

#### In Node.js:

```js
import {
    deserialize,
    deserializeAsync,
    serialize,
    serializeAsync,
} from '@gorhill/s14e-serializer';

// Serialize data into string
const s1 = serialize(data1);

// Serialize and compress data into string
const s2 = serialize(data2, { compress: true });

// Write strings to some storage

// ...

// Read strings from some storage

// Restore data from string
const data1 = deserialize(s1);

// Restore data from string
const data2 = deserialize(s2);

```

#### In browser

Copy `s14e-serializer.js` into your project, then:

```js
import {
    deserialize,
    deserializeAsync,
    serialize,
    serializeAsync,
} from './s14e-serializer.js';

```


See [test/test.js](./test/test.js) for typical usage and currently supported
data types.

### Validation

Use `npm run test` to execute test suite.


<!----------------------------------------------------------------------------->

[NPM]: https://www.npmjs.com/package/@gorhill/s14e-serializer

<!----------------------------------[ Badges ]--------------------------------->

[Badge NPM]: https://img.shields.io/npm/v/@gorhill/s14e-serializer
