import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/scripts/**', '**/.claude-plugin/**', '**/.claude/**', '**/.planning/**'],
  },
  {
    files: ['packages/runtime/src/**/*.ts', 'packages/plugin/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['paperclip*', '@paperclip/*'],
            message: 'Paperclip imports are forbidden in this package (ADPT-01).'
          }
        ]
      }]
    }
  }
);
