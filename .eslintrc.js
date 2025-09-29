module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // Reglas de estilo
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // Reglas de código
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-return': 'error',
    
    // Reglas de Node.js
    'no-process-exit': 'error',
    'no-sync': 'warn',
    
    // Reglas de async/await
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    
    // Reglas de seguridad
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Reglas de consistencia
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'comma-dangle': ['error', 'never'],
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
    'space-before-blocks': ['error', 'always'],
    'space-before-function-paren': ['error', 'never'],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    
    // Reglas de comentarios
    'spaced-comment': ['error', 'always'],
    
    // Reglas de strings
    'template-curly-spacing': ['error', 'never'],
    
    // Reglas de objetos
    'object-property-newline': ['error', { 'allowMultiplePropertiesPerLine': true }],
    
    // Reglas de funciones
    'func-call-spacing': ['error', 'never'],
    'function-paren-newline': ['error', 'multiline-arguments'],
    
    // Reglas de arrays
    'array-element-newline': ['error', 'consistent'],
    
    // Reglas de operadores
    'operator-linebreak': ['error', 'after'],
    
    // Reglas de bloques
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    'curly': ['error', 'all'],
    
    // Reglas de control de flujo
    'no-else-return': 'error',
    'no-return-assign': 'error',
    'no-unmodified-loop-condition': 'error',
    
    // Reglas de comparación
    'eqeqeq': ['error', 'always'],
    'no-eq-null': 'error',
    'no-nested-ternary': 'error',
    
    // Reglas de variables
    'no-shadow': 'error',
    'no-undef-init': 'error',
    'no-use-before-define': ['error', { 'functions': false, 'classes': true }],
    
    // Reglas de funciones
    'no-duplicate-parameters': 'error',
    'no-empty-function': 'error',
    'no-extra-parens': ['error', 'functions'],
    'no-return-await': 'error',
    
    // Reglas de objetos
    'no-dupe-keys': 'error',
    'no-dupe-class-members': 'error',
    'no-duplicate-case': 'error',
    
    // Reglas de arrays
    'no-duplicate-imports': 'error',
    'no-useless-concat': 'error',
    
    // Reglas de regex
    'no-regex-spaces': 'error',
    'no-useless-escape': 'error',
    
    // Reglas de promesas
    'prefer-promise-reject-errors': 'error',
    
    // Reglas de async
    'no-await-in-loop': 'warn',
    'require-atomic-updates': 'error'
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off',
        'no-unused-vars': 'off'
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};

