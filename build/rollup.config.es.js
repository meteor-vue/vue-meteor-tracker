import base from './rollup.config.base'

const config = Object.assign({}, base, {
  output: {
    file: 'dist/vue-meteor-tracker.esm.js',
    format: 'es',
    name: 'vue-meteor-tracker',
  },
})

export default config
