module.exports = {
  root: true,
  plugins: [
    '@typescript-eslint',
  ],
  // https://github.com/feross/standard/blob/master/RULES.md#javascript-standard-style
  extends: [
    'eslint-config-standard',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    parser: {
      js: 'espree',
      jsx: 'espree',
      ts: '@typescript-eslint/parser',
      tsx: '@typescript-eslint/parser',
    },
  },
  // required to lint *.vue files
  /* plugins: [
    'html'
  ], */
  env: {
    browser: true,
    node: true,
  },
  // add your custom rules here
  rules: {
    // allow paren-less arrow functions
    'arrow-parens': 0,
    // allow async-await
    'generator-star-spacing': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    // trailing comma
    'comma-dangle': ['error', 'always-multiline'],
    // beware of returning assignement
    'no-return-assign': 'off',
    'no-extend-native': 'warn',
  },
  globals: {
    Meteor: false,
    Tracker: false,
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // The core 'no-unused-vars' rules (in the eslint:recommeded ruleset)
        // does not work with type definitions
        'no-unused-vars': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '!.*',
  ],
}
