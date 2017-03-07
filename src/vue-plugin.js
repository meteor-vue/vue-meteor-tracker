import omit from 'lodash.omit';

function defaultSubscription(...args) {
  return Meteor.subscribe(...args);
}

export default {
  install(Vue, options) {

    const vueVersion = parseInt(Vue.version.charAt(0));

    const { defineReactive } = Vue.util;

    Vue.config.meteor = {
      subscribe: defaultSubscription,
      freeze: false,
    };

    for(const k in options) {
      Vue.config.meteor[k] = options[k];
    }

    const merge = Vue.config.optionMergeStrategies.methods
    Vue.config.optionMergeStrategies.meteor = function (toVal, fromVal, vm) {
      if (!toVal) return fromVal
      if (!fromVal) return toVal

      const toData = Object.assign({}, omit(toVal, [
        'subscribe',
        'data',
      ]), toVal.data);
      const fromData = Object.assign({}, omit(fromVal, [
        'subscribe',
        'data',
      ]), fromVal.data);

      return Object.assign({
        subscribe: merge(toVal.subscribe, fromVal.subscribe),
      }, merge(toData, fromData))
    }

    function prepare() {
      this._trackerHandles = [];
      this._subsAutorun = {};
      this._subs = {};

      // $subReady state
      defineReactive(this, '$subReady', {});
    }

    function launch() {

      let meteor = this.$options.meteor;

      if (meteor) {

        const data = Object.assign({}, omit(meteor, [
          'subscribe',
          'data',
        ]), meteor.data);

        // Reactive data
        if (data) {
          for (let key in data) {
            ((key, options) => {
              let func, vueParams;
              if (typeof options === 'function') {
                func = options.bind(this);
              } else if (typeof options.update === 'function') {
                func = options.update.bind(this);
                if (typeof options.params === 'function') {
                  vueParams = options.params.bind(this);
                }
              } else {
                throw Error('You must provide either a function or an object with the update() method.');
              }

              this.$data[key] = null;
              defineReactive(this, key, null);

              let computation;

              let autorun = (params) => {
                computation = this.$autorun(() => {
                  let result = func(params);
                  if (result && typeof result.fetch === 'function') {
                    result = result.fetch();
                  }
                  if(Vue.config.meteor.freeze) {
                    result = Object.freeze(result);
                  }
                  this[key] = result;
                });
              }

              if (vueParams) {
                this.$watch(vueParams, (params) => {
                  if (computation) {
                    this.$stopHandle(computation);
                  }
                  autorun(params);
                }, {
                  immediate: true,
                  deep: !!options.deep
                });
              } else {
                autorun();
              }
            })(key, data[key]);
          }
        }

        // Subscriptions
        if (meteor.subscribe) {
          for (let key in meteor.subscribe) {
            ((key, options) => {
              let subscribe = params => this.$subscribe(key, ...params);

              if (typeof options === 'function') {
                this.$watch(options, params => {
                  subscribe(params);
                }, {
                  immediate: true,
                })
              } else {
                subscribe(options);
              }
            })(key, meteor.subscribe[key]);
          }
        }
      }
    }

    Vue.mixin({

      // Vue 1.x
      init: prepare,
      // Vue 2.x
      beforeCreate: prepare,

      created: launch,

      destroyed: function() {
        //Stop all reactivity when view is destroyed.
        this._trackerHandles.forEach((tracker) => {
          try {
            tracker.stop()
          } catch (e) {
            console.error(e, tracker)
          }
        })
        this._trackerHandles = null
      },

      methods: {
        $subscribe(...args) {
          if(args.length > 0) {
            const key = args[0];
            const oldSub = this._subs[key]
            let handle = Vue.config.meteor.subscribe.apply(this, args);
            this._trackerHandles.push(handle);
            this._subs[key] = handle

            // Readiness
            if(typeof handle.ready === 'function') {
              defineReactive(this.$subReady, key, false);
              if (this._subsAutorun[key]) {
                this._subsAutorun[key].stop();
              }
              const autorun = this.$autorun(() => {
                const ready = this.$subReady[key] = handle.ready();
                // Wait for the new subscription to be ready before stoping the old one
                if (ready && oldSub) {
                  this.$stopHandle(oldSub)
                }
              });
              this._subsAutorun[key] = autorun;
            }

            return handle;
          } else {
            throw new Error('You must provide the publication name to $subscribe.');
          }
        },

        $autorun(reactiveFunction) {
          let handle = Tracker.autorun(reactiveFunction);
          this._trackerHandles.push(handle);
          return handle;
        },

        $stopHandle(handle) {
          handle.stop();
          let index = this._trackerHandles.indexOf(handle);
          if (index !== -1) {
            this._trackerHandles.splice(index, 1);
          }
        },

      },

    });

  }
}
