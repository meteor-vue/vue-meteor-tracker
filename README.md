# Vue integration for Meteor

[![npm](https://img.shields.io/npm/v/vue-meteor-tracker.svg) ![npm](https://img.shields.io/npm/dm/vue-meteor-tracker.svg)](https://www.npmjs.com/package/vue-meteor-tracker)
[![vue3](https://img.shields.io/badge/vue-3.x-brightgreen.svg) ![vue2.7](https://img.shields.io/badge/vue-2.7-brightgreen.svg)](https://vuejs.org/)

Reactive subscriptions and data from Meteor for Vue components.

## Sponsors

[Become a sponsor!](https://github.com/sponsors/Akryum)

We are very grateful to all our sponsors for their support:

<p align="center">
  <a href="https://guillaume-chau.info/sponsors/" target="_blank">
    <img src='https://akryum.netlify.app/sponsors.svg'/>
  </a>
</p>

<br>

## Installation

```sh
meteor npm install --save vue-meteor-tracker@next
```

Install `vite:bundler` too:

```sh
meteor add vite:bundler
```

[Learn more](https://packosphere.com/vite/bundler)

Example Vite config:

```js
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    Vue(),
  ],

  optimizeDeps: {
    exclude: [
      'vue-meteor-tracker',
    ],
  },

  meteor: {
    clientEntry: 'imports/ui/main.ts',
  },
})
```

## Options API

Install the plugin into Vue:

```js
import { VueMeteor } from 'vue-meteor-tracker'
app.use(VueMeteor)
```

In your Vue component, add a `meteor` object :


```js
export default {
  meteor: {
    // Meteor specific options
  }
}
```

### Subscriptions

Add an object for each subscription in a `$subscribe` object. The object key is the name of the publication and the value is either an array of parameters or a function returning an array of parameters. These subscription will be stopped when the component is destroyed.

```js
export default {
  meteor: {
    // Subscriptions
    $subscribe: {
      // Subscribes to the 'threads' publication with no parameters
      'threads': [],
      // Subscribes to the 'threads' publication with static parameters
      'threads': ['new', 10], // The 10 newest threads
      // Subscribes to the 'posts' publication with dynamic parameters
      // The subscription will be re-called when a vue reactive property changes
      'posts': function() {
        // Here you can use Vue reactive properties
        return [this.selectedThreadId] // Subscription params
      }
    }
  }
}
```


You can also use the `$subscribe(name, params)` method in you component code:


```js
mounted () {
  // Subscribes to the 'threads' publication with two parameters
  this.$subscribe('thread', ['new', 10])
}
```

The `$subReady` object on your component contains the state of your subscriptions. For example, to know if the 'thread' subscription is ready, use this *reactive* expression:

```js
console.log(this.$subReady.thread)
```

Or in your template:

```html
<div v-if="!$subReady.thread">Loading...</div>
```

You can also change the default subscription method by defining the `Vue.config.meteor.subscribe` function:


```js
import { config } from 'vue-meteor-tracker'

// You can replace the default subcription function with your own
// Here we replace the native subscribe() with a cached one
// with the ccorcos:subs-cache package
const subsCache = new SubsCache({
  expireAfter: 15,
  cacheLimit: -1
})

config.subscribe = function(...args) {
  return subsCache.subscribe(...args)
}
```

### Reactive data

You can add reactive properties that update from any Meteor reactive sources (like collections or session) by putting an object for each property in the `meteor` object. The object key is the name of the property (it shouldn't start with `$`), and the value is a function that returns the result.

Here is an example:

```js
export default {
  data() {
    return {
      selectedThreadId: null
    }
  },
  meteor: {
    // Subscriptions
    $subscribe: {
      // We subscribe to the 'threads' publication
      'threads': []
    },
    // Threads list
    // You can access tthe result with the 'threads' property on the Vue instance
    threads () {
      // Here you can use Meteor reactive sources
      // like cursors or reactive vars
      // as you would in a Blaze template helper
      return Threads.find({}, {
        sort: {date: -1}
      })
    },
    // Selected thread
    selectedThread () {
      // You can also use Vue reactive data inside
      return Threads.findOne(this.selectedThreadId)
    }
  }
})
```

Use the reactive data in the template:


```html
<!-- Thread list -->
<ThradItem
  v-for="thread in threads"
  :data="thread"
  :selected="thread._id === selectedThreadId"
  @select="selectThread(thread._id)"
/>

<!-- Selected thread -->
<Thread v-if="selectedThread" :id="selectedThreadId"/>
```


Or anywhere else in you Vue component:

```js
computed: {
  count () {
    return this.threads.length
  }
}
```

### Meteor Methods

You can call a Meteor method with a promise using `callMethod`:

```js
import { callMethod } from 'vue-meteor-tracker'

export default {
  methods: {
    async insertLink () {
      try {
        await callMethod('links.insert', 'title', 'url')
        console.log('done')
      } catch (e) {
        console.error(e)
      }
    },
  },
}
```

---

## Composition API

### Subscriptions

Inside the component `setup`, you can use the `subscribe` function:

```js
import { subscribe } from 'vue-meteor-tracker'

// Simple sub

subscribe('links')
// With params
subscribe('linksByPageAndLimit', 1, 10)

// Reactive sub

const page = ref(1)
subscribe(() => ['linksByPageAndLimit', page.value, 10])
```

If you need to subscribe later (outside of the `setup` context), call `useSubscribe` instead:

```js
import { useSubscribe } from 'vue-meteor-tracker'

const { subscribe } = useSubscribe()

setTimeout(() => {
  subscribe('linksByPage', 2)
}, 1000)
```


### Reactive Data

In the component `setup` context, you can use the `autorun` function:

```js
import { autorun } from 'vue-meteor-tracker'
import { LinksCollection } from '/imports/api/links'

const links = autorun(() => LinksCollection.find({}).fetch()).result
// const { result, stop } = autorun(() => LinksCollection.find({}).fetch())
```

If you need to start an autorun later (outside of the `setup` context), call `useAutorun` instead:

```js
import { useAutorun } from 'vue-meteor-tracker'
import { LinksCollection } from '/imports/api/links'

const { autorun } = useAutorun()

// Later...
const links = autorun(() => LinksCollection.find({}).fetch()).result
```

### Meteor Methods

You can call a Meteor method with a promise using `callMethod`:

```js
import { callMethod } from 'vue-meteor-tracker'

async function insertLink () {
  try {
    await callMethod('links.insert', 'title', 'url')
    console.log('done')
  } catch (e) {
    console.error(e)
  }
}
```

To keep track of pending, error and result state with reactive variables, you can use `useMethod`:

```ts
import { useMethod } from 'vue-meteor-tracker'
import { LinksCollection } from '/imports/api/links'

const insertLinkMethod = useMethod<[url: string, link: string]>('links.insert')
insertLinkMethod.onResult((err) => {
  if (!err) {
    // Reset form
    insertLinkForm.title = ''
    insertLinkForm.url = ''
  }
})

// Reactive state
watch(insertLinkMethod.pending, () => { /* ... */ })
watch(insertLinkMethod.error, () => { /* ... */ })
watch(insertLinkMethod.result, () => { /* ... */ })

const insertLinkForm = reactive({
  title: '',
  url: '',
})

async function insertLink () {
  await insertLinkMethod.call(insertLinkForm.title, insertLinkForm.url)
  console.log('done')
}
```

---

## License

MIT
