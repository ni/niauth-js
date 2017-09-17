module.exports = {
   'env': {
      'browser': true,
      'commonjs': true,
      'node': true,
      'es6': true
   },
   'extends': 'eslint:recommended',
   'rules': {
      // Classes should be pascal case.
      // NOTE: No ESLint rule for this!

      // Variables and functions should be camel case.
      'camelcase': [2, {properties: 'never'}],

      // End all statements with a semicolon.
      'semi': 2,

      // Use 3-space indentation. Yes, this differs from standard practice.
      'indent': ['error', 3],
      'no-tabs': 2,

      // Use blocks with all if statements.
      'curly': ['error', 'all'],

      // Use single quotes for string literal notation.
      'quotes': ['error', 'single'],

      // For ... in statements should check hasOwnProperty for each property.
      'guard-for-in': 2,

      // The default case for switch statement should be terminated with break.
      'default-case': 2,
      'no-fallthrough': 2,

      // Use strict equality operators (e.g., === and !==)
      'eqeqeq': 2,

      // Use literals like '{}' instead of the new operator for primitives.
      'no-new': 2,
      'no-new-symbol': 2,
      'no-new-func': 2,
      'no-new-wrappers': 2,
      'no-new-object': 2,

      // All variables should be declared with 'var'
      'no-undef': 2, 

      // Variables should be declared only once within a scope.
      'no-redeclare': 2,

      // Use variable assignment function expressions to define functions.
      'func-style': ['error', 'expression'],

      // Do not use reserved keywords for variable names.
      'no-shadow-restricted-names': 2,
      'no-invalid-this': 2,

      // Do not use expressions, methods, etc not supported by IE9.
      // NOTE: No ESLint rule for this!

      // Do not declare global variables
      'no-implicit-globals': 2,

      // Do not declare functions within loops.
      'no-loop-func': 2,

      // With statements should not be used.
      'no-with': 2,

      // Eval function should not be used.
      'no-eval': 2,
      'no-implied-eval': 2,

      // Multi-line string literals should not be used.
      'no-multi-str': 2,

      // Prototypes of built-in objects should not be modified.
      'no-extend-native': 2,

      // The arguments object should not be sliced or modified directly.
      // NOTE: No ESLint rule for this!

      // Additional rules not specified in NI's JavaScript style guides.
      'no-multiple-empty-lines': [2, {max: 2}],
      'no-trailing-spaces': 2,
      'no-alert': 2,
      // TODO: comply with this!
      //'no-param-reassign': 2,
   }
};
