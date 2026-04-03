#!/usr/bin/env node

// agents-companion -- Phase 1 stub
// Real implementation added in Phase 2 (config loader, adapters) and Phase 3 (commands).

const args = process.argv.slice(2);
const command = args[0] || 'help';

console.log(`[agents-companion] stub -- command: ${command}`);
console.log('[agents-companion] This is a placeholder. Feature code will be added in Phase 2+.');
process.exit(0);
