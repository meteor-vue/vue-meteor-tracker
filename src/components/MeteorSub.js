// @vue/component
export default {
  name: 'MeteorSub',

  props: {
    name: {
      type: String,
      required: true,
    },

    parameters: {
      type: [Array, Function],
      default: undefined,
    },

    tag: {
      type: String,
      default: 'div',
    },
  },

  watch: {
    name: 'updateSub',
    parameters (value, oldValue) {
      if (typeof value !== typeof oldValue) this.updateSub()
    },
  },

  created () {
    this.updateSub()
  },

  methods: {
    updateSub () {
      if (this.$_unsub) this.$_unsub()
      const parameters = typeof this.parameters === 'function' ? this.parameters : () => this.parameters || []
      this.$_unsub = this.$subscribe(this.name, parameters)
    },
  },

  render (h) {
    let result = this.$scopedSlots.default({
      loading: !this.$subReady[this.name],
    })
    if (Array.isArray(result)) {
      result = result.concat(this.$slots.default)
    } else {
      result = [result].concat(this.$slots.default)
    }
    return h(this.tag, result)
  },
}
