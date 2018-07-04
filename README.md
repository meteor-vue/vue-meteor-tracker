# Vue integration for Meteor

[![npm](https://img.shields.io/npm/v/vue-meteor-tracker.svg) ![npm](https://img.shields.io/npm/dm/vue-meteor-tracker.svg)](https://www.npmjs.com/package/vue-meteor-tracker)
[![vue1](https://img.shields.io/badge/vue-1.x-brightgreen.svg) ![vue2](https://img.shields.io/badge/vue-2.x-brightgreen.svg)](https://vuejs.org/)

Declarative subscriptions and meteor reactive data (subscriptions, collections, tracker...)

[Example project](https://github.com/Akryum/meteor-vue-example)

<p>
  <a href="https://www.patreon.com/akryum" target="_blank">
    <img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Become a Patreon">
  </a>
</p>

<br>

## Installation

```
meteor npm install --save vue-meteor-tracker
```

Install the plugin into Vue:

```js
import VueMeteorTracker from 'vue-meteor-tracker'
Vue.use(VueMeteorTracker)
```

*Note: if you are using the Meteor [akryum:vue](https://github.com/Akryum/meteor-vue-component/tree/master/packages/vue) package, you don't need to install the plugin.*

**⚠️ You may need to polyfill `Object.assign`.**

## Usage

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
// You can replace the default subcription function with your own
// Here we replace the native subscribe() with a cached one
// with the ccorcos:subs-cache package
const subsCache = new SubsCache({
  expireAfter: 15,
  cacheLimit: -1
})

Vue.config.meteor.subscribe = function(...args) {
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

### Activating and deactivating meteor data

You can deactivate and activate again the meteor data on the component with `this.$startMeteor` and `this.$stopMeteor`:

```js
export default {
  meteor: {
    // ...
  },

  methods: {
    activate () {
      this.$startMeteor()
    },

    deactivate () {
      this.$stopMeteor()
    }
  }
}
```

You can also prevent meteor data from starting automatically with `$lazy`:

```js
export default {
  meteor: {
    $lazy: true,
    // ...
  }
}
```

### Freezing data

This option will apply `Object.freeze` on the Meteor data to prevent Vue from setting up reactivity on it. This can improve the performance of Vue when rendering large collection lists for example. By default, this option is turned off.

```js
// Disable Vue reactivity on Meteor data
Vue.config.meteor.freeze = true
```

### Without meteor option

**Not currently SSR-friendly**

With the special methods injected to the components, you can use reactive Meteor data without the `meteor` option:

```js
export default {
  data () {
    return {
      limit: 5,
      sort: true,
    }
  },

  created () {
    // Not SSR friendly (for now)
    this.$subscribe('notes', () => [this.limit])
  },

  computed: {
    notes () {
      // Not SSR friendly (for now)
      return this.$autorun(() => Notes.find({}, {
        sort: { created: this.sort ? -1 : 1 },
      }))
    },

    firstNote () {
      return this.notes.length && this.notes[0]
    },
  },
}
```

### Components

**Vue 2+ only**

You can use Meteor directly in the template using the Meteor components and scoped slots:

```html
<!-- Subscription -->
<MeteorSub
  name="notes"
  :parameters="[limit]"
>
  <template slot-scope="{ loading }">
    <button @click="sort = !sort">Toggle sort</button>

    <!-- Reactive Meteor data -->
    <MeteorData
      :query="findNotes"
      class="notes"
    >
      <template slot-scope="{ data: notes }">
        <div v-for="note in notes" class="note">
          <div class="text">{{ note.text }}</div>
        </div>
      </template>
    </MeteorData>

    <div v-if="loading" class="loading">Loading...</div>
  </template>
</MeteorSub>
```

```js
import { Notes } from '../api/collections'

export default {
  data () {
    return {
      sort: true,
    }
  },

  methods: {
    findNotes () {
      return Notes.find({}, {
        sort: { created: this.sort ? -1 : 1 },
      })
    }
  }
}
```

---

## Next steps

- [Write your components in vue files](https://github.com/Akryum/meteor-vue-component/tree/master/packages/vue-component#usage)
- [Example project without blaze](https://github.com/Akryum/meteor-vue-example)
- [Example project with blaze](https://github.com/Akryum/meteor-vue-blaze)
- [Add routing to your app](https://github.com/Akryum/meteor-vue-component/tree/master/packages/vue-router#installation)
- [Add internationalization to your app](https://github.com/Akryum/meteor-vue-component/tree/master/packages/vue-i18n#installation)
- [Manage your app state with a vuex store](https://github.com/Akryum/meteor-vue-component/tree/master/packages/vuex#installation)
- [Integrate apollo](https://github.com/Akryum/meteor-vue-component/tree/master/packages/vue-apollo#installation)

---

LICENCE ISC - Created by Guillaume CHAU (@Akryum)
