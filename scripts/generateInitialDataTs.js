import fs from 'fs';

const records = JSON.parse(fs.readFileSync('data/records.json', 'utf-8'));
const tables = JSON.parse(fs.readFileSync('data/reference_tables.json', 'utf-8'));

const content = `import { InterruptionRecord, ReferenceTables } from '../types/interruption';

export const INITIAL_RECORDS: InterruptionRecord[] = ${JSON.stringify(records, null, 2)};

export const INITIAL_REFERENCE_TABLES: ReferenceTables = ${JSON.stringify(tables, null, 2)};
`;

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/initialData.ts', content);
console.log('Successfully generated src/data/initialData.ts');
