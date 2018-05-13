import base from './rollup.config.base'

const config = Object.assign({}, base, {
  output: {
    file: 'dist/vue-meteor-tracker.umd.js',
    format: 'umd',
    name: 'vue-meteor-tracker',
  },
})

export default config
