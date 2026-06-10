module.exports = {
  env: { node: true, es2021: true, jest: true },
  extends: 'airbnb-base',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'script' },
  rules: {
    'no-console': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'max-len': ['warn', { code: 100, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'import/no-unresolved': ['error', { ignore: ['^@/'] }],
    'consistent-return': 'off',
    'no-underscore-dangle': 'off',
    'class-methods-use-this': 'off',
  },
};
