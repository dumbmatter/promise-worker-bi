promise-worker-bi [![Build Status](https://travis-ci.org/dumbmatter/promise-worker-bi.svg?branch=master)](https://travis-ci.org/dumbmatter/promise-worker-bi)
====

A small (~2 kB min+gz) and performant library for communicating with web workers and shared workers, using promises. Post a message from the browser to the worker, get a promise that resolves to the response. Post a message from the worker to the browser, get a promise that resolves to the response. And with shared workers, you can either broadcast to all browser tabs or send a message to a specific tab.

This is based on [promise-worker](https://github.com/nolanlawson/promise-worker) which only allows you to send messages from the browser to the worker, not in reverse. This library allows both, using the exact same API, and has additional support for shared workers.

Usage
---

Install:

    yarn add promise-worker-bi

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

**Notice that except for initialization of the `promiseWorker` object, the API is identical in the browser and in the worker. Either one can initiate a message.** In all of the subsequent examples, `promiseWorker` initialization is omitted, so you can put the two blocks of code respectively in the worker and browser, or in the browser and worker.

And it's even better with async/await:

```js
const response = await promiseWorker.postMessage('ping2');
// response contains 'pong2'
```

### Message format

The message you send can be any object, array, string, number, etc. - anything that is serializable by the structured clone algorithm:

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

### Error handling

Any thrown errors or asynchronous rejections during a response will be propagated as a rejected promise. For instance:

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

But what about errors in the worker that are *not* during a response? (Errors in the host, you can handle as you would normally do.)

For a Web Worker, we could just use [the normal `error` event](https://developer.mozilla.org/en-US/docs/Web/API/AbstractWorker/onerror) and be fine. But for a Shared Worker, that is not the case, because browsers seem to handle errors inside Shared Workers differently (currently Firefox seems to send the normal `error` event to all hosts, but [Chrome does not](https://bugs.chromium.org/p/chromium/issues/detail?id=105001)). Therefore, promise-worker-bi includes a unified API that works in Web Workers and Shared Workers.

```js
promiseWorker.registerError(function (err) {
  console.log('Error inside worker!', err);
});
```

That will work if `worker` is a Web Worker or a Shared Worker, but there is one important difference. For a Shared Worker, it will only fire in the first host, to prevent duplicate errors from reaching an error log (assuming you're logging these errors somewhere).


### Multi-type messages

If you need to send messages of multiple types to the worker, just add some type information to the message you send:

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

### Shared Workers

Shared Workers are like Web Workers, but multiple tabs of your app can share the same worker process. In this model, you have one copy of promise-worker-bi running inside your Shared Worker and one copy running in each tab the user opens of your application. Sending messages from a tab to the Shared Worker is the same as above. But when sending messages from the Shared Worker, it's different because there are potentially multiple tabs. Currently, promise-worker-bi supports either broadcasting a message to all tabs or sending a message to one specific tab.

Here's an example:

```js
// main.js
var PromiseWorker = require('promise-worker-bi');

var worker = new SharedWorker('worker.js');
var promiseWorker = new PromiseWorker(worker);

promiseWorker.register(function (message) {
  console.log(message);
});

// setTimeout is just to give you enough time to open main.js and main2.js in
// two separate tabs.
setTimeout(function () {
  promiseWorker.postMessage('broadcast').then(function (response) {
    console.log('Echoed response:', response);
  })
}, 1000);
```

```js
// main2.js
var PromiseWorker = require('promise-worker-bi');

var worker = new SharedWorker('worker.js');
var promiseWorker = new PromiseWorker(worker);

promiseWorker.register(function (message) {
  console.log(message);
});

// setTimeout is just to give you enough time to open main.js and main2.js in
// two separate tabs.
setTimeout(function () {
  promiseWorker.postMessage('just this tab').then(function (response) {
    console.log('Echoed response:', response);
  })
}, 2000);
```

```js
// worker.js
var PromiseWorker = require('promise-worker-bi');

var promiseWorker = new PromiseWorker();

promiseWorker.register(function (message, hostID) {
  if (message === 'broadcast') {
    promiseWorker.postMessage('to all tabs');
  } else {
    promiseWorker.postMessage('hello host ' + hostID, hostID);
  }

  return message;
});

```

Then open main.js and main2.js in two browser tabs. The message sent from main.js ('broadcast') will result in worker.js sending a message to both tabs, but the message sent in main2.js will result in a message sent only to that one tab. So if you look in the consoles in your two tabs, you will see this in the first tab:

    to all tabs
    Echoed response: broadcast

And this in the second tab:

    to all tabs
    hello host 1
    Echoed response: just this tab

(If you open main2.js first, "hello host 1" will instead be "hello host 0".)

Browser support
----

* Chrome
* Firefox
* Safari 8+
* IE 10+
* Edge
* iOS 8+
* Android 4.4+

Old browsers will need Map and Promise polyfills.

There used to be automated tests in various browsers via [zuul](https://github.com/defunctzombie/zuul) and Sauce Labs, but it suffered bit rot and I could no longer get it to work consistently (PRs welcome!). Currently, `yarn test` uses [Karma](https://karma-runner.github.io/) to run tests in whatever versions of Chrome and Firefox you have installed.

API
---

### Main bundle

#### `new PromiseWorker(worker: Worker | SharedWorker)`

Create a new instance of `PromiseWorker`, using the given worker.

* `worker` - the `Worker`, `SharedWorker` or [PseudoWorker](https://github.com/nolanlawson/pseudo-worker) to use.

### Worker bundle

#### `new PromiseWorker()`

Create a new instance of `PromiseWorker`.

### Both bundles

#### `promiseWorker.register((message: any, hostID?: number) => any)`

Register a message handler wherever you will be receiving messages: in the worker, in the browser, or both. Your handler consumes a message and returns a promise or value.

The `hostID` parameter is only defined inside a shared worker, in which case it is a unique number identifying the host that the message came from.

#### `promiseWorker.postMessage(message: any, hostID?: number): Promise<any>`

Send a message to the browser or worker and return a Promise.

The `hostID` parameter is only meaningful when sending a message from a shared worker. If you leave it out, it will send the message to all hosts. If you include it, it will send the message only to that specific host. You can get the `hostID` from the `promiseWorker.register` function described above.

#### `promiseWorker.registerError((error: Error) => void)`

When an error in your web/shared worker process occurs that is *not* directly in response to a `promiseWorker.postMessage` call, it will be sent to the callback you provide here to `promiseWorker.registerError`.

Although [normally stack traces are not sent from the worker to the main thread](https://github.com/mknichel/javascript-errors/blob/master/README.md#dedicated-workers), promise-worker-bi magically works around this problem so you will see a stack trace in `error`.
