// @vue/component
export default {
  name: 'MeteorData',

  props: {
    query: {
      type: Function,
      required: true,
    },

    tag: {
      type: String,
      default: 'div',
    },
  },

  watch: {
    query: {
      handler (value) {
        if (this.$_unwatch) this.$_unwatch()
        this.$_unwatch = this.$addMeteorData('meteorData', value)
      },
      immediate: true,
    },
  },

  render (h) {
    let result = this.$scopedSlots.default({
      data: this.$data.$meteor.data.meteorData,
    })
    if (Array.isArray(result)) {
      result = result.concat(this.$slots.default)
    } else {
      result = [result].concat(this.$slots.default)
    }
    return h(this.tag, result)
  },
}
