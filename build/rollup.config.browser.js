import base from './rollup.config.base'
import uglify from 'rollup-plugin-uglify'
import { minify } from 'uglify-es'

const config = Object.assign({}, base, {
  output: {
    file: 'dist/vue-meteor-tracker.min.js',
    format: 'iife',
    name: 'VueMeteorTracker',
  },
})

config.plugins.push(uglify({}, minify))

export default config
