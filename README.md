promise-worker-bi [![Build Status](https://travis-ci.org/dumbmatter/promise-worker-bi.svg?branch=master)](https://travis-ci.org/dumbmatter/promise-worker-bi)
====

[![Sauce Test Status](https://saucelabs.com/browser-matrix/promise-worker-bi.svg)](https://saucelabs.com/u/promise-worker-bi)

A small and performant library for communicating with Web Workers, using Promises. Post a message to the worker, get a promise that resolves to the response. Post a message to the browser within the worker, get a promise that resolves to the response.

This is based on [promise-worker](https://github.com/nolanlawson/promise-worker) which only allows you to send messages from the browser to the worker, not in reverse. This library allows both, using the exact same API.

**Goals:**

 * Tiny footprint (~2 kB min+gz)
 * Assumes you have a separate `worker.js` file (easier to debug, better browser support)
 * `JSON.stringify`s messages [for performance](http://nolanlawson.com/2016/02/29/high-performance-web-worker-messages/)

Usage
---

Install:

    npm install promise-worker-bi

Inside your main bundle:

```js
// main.js
var PromiseWorker = require('promise-worker-bi');

var worker = new Worker('worker.js');
var promiseWorker = new PromiseWorker(worker);

// Only needed if you send messages from the worker to the host
promiseWorker.register(function (message) {
  return 'pong2';
});

promiseWorker.postMessage('ping').then(function (response) {
  // handle response 'pong'
}).catch(function (error) {
  // handle error
});
```

Inside your `worker.js` bundle:

```js
// worker.js
var PromiseWorker = require('promise-worker-bi');

var promiseWorker = new PromiseWorker();

// Only needed if you send messages from the host to the worker
promiseWorker.register(function (message) {
  return 'pong';
});

promiseWorker.postMessage('ping2').then(function (response) {
  // handle response 'pong2'
}).catch(function (error) {
  // handle error
});
```

**Notice that except for initialization of the `promiseWorker` object, the API
is identical in the browser and in the worker. Either one can initiate a
message.** In all of the subsequent examples, `promiseWorker` initialization is
omitted, so you can put the two blocks of code respectively in the worker and
browser, or in the browser and worker.

And it's even better with async/await:

```js
const response = await promiseWorker.postMessage('ping2');
// response contains 'pong2'
```

### Message format

The message you send can be any object, array, string, number, etc. - anything
that is serializable in JSON:

```js
promiseWorker.postMessage({
  hello: 'world',
  answer: 42,
  "this is fun": true
}).then(/* ... */);
```

```js
promiseWorker.register(function (message) {
  console.log(message); // { hello: 'world', answer: 42, 'this is fun': true }
});
```

Note that the message will be `JSON.stringify`d, so you
can't send functions, `Date`s, custom classes, etc.

### Promises

The registered handler can return either a Promise or a normal value:

```js
promiseWorker.register(function () {
  return Promise.resolve().then(function () {
    return 'much async, very promise';
  });
});
```

```js
promiseWorker.postMessage(null).then(function (message) {
  console.log(message): // 'much async, very promise'
});
```

Ultimately, the value that is sent from the worker to the main thread is also
`stringify`d, so the same format rules apply.

### Error handling

Any thrown errors or asynchronous rejections from the worker will
be propagated to the main thread as a rejected Promise. For instance:

```js
promiseWorker.register(function (message) {
  throw new Error('naughty!');
});
```

```js
promiseWorker.postMessage('whoops').catch(function (err) {
  console.log(err.message); // 'naughty!'
});
```

Note that stacktraces cannot be sent from the worker to the main thread, so you
will have to debug those errors yourself. This library does however, print
messages to `console.error()`, so you should see them there.

### Multi-type messages

If you need to send messages of multiple types to the worker, just add
some type information to the message you send:

```js
promiseWorker.postMessage({
  type: 'en'
}).then(/* ... */);

promiseWorker.postMessage({
  type: 'fr'
}).then(/* ... */);
```

```js
promiseWorker.register(function (message) {
  if (message.type === 'en') {
    return 'Hello!';
  } else if (message.type === 'fr') {
    return 'Bonjour!';
  }
});
```

Browser support
----

See [.zuul.yml](https://github.com/dumbmatter/promise-worker-bi/blob/master/.zuul.yml) for the full list
of tested browsers, but basically:

* Chrome
* Firefox
* Safari 8+
* IE 10+
* Edge
* iOS 8+
* Android 4.4+

If a browser [doesn't support Web Workers](http://caniuse.com/webworker) but you still want to use this library,
then you can use [pseudo-worker](https://github.com/nolanlawson/pseudo-worker).

This library is not designed to run in Node.js.

API
---

### Main bundle

#### `new PromiseWorker(worker)`

Create a new instance of `PromiseWorker`, using the given worker.

* `worker` - the `Worker` or [PseudoWorker](https://github.com/nolanlawson/pseudo-worker) to use.

### Worker bundle

#### `new PromiseWorker()`

Create a new instance of `PromiseWorker`.

* `worker` - the `Worker` or [PseudoWorker](https://github.com/nolanlawson/pseudo-worker) to use.

### Both bundles

#### `PromiseWorker.register(function)`

Register a message handler wherever you will be receiving messages: in the worker, in the
browser, or both. Your handler consumes a message and returns a Promise or value.

* `function`
  * Takes a message, returns a Promise or a value.

#### `PromiseWorker.postMessage(message)`

Send a message to the browser or worker and return a Promise.

* `message` - object - required
  * The message to send.
* returns a Promise containing the response.

Testing the library
---

First:

    npm install

Then to test in Node (using an XHR/PseudoWorker shim):

    npm test

Or to test manually in your browser of choice:

    npm run test-local

Or to test in a browser using SauceLabs:

    npm run test-browser

Or to test with coverage reports:

    npm run coverage
