import { config } from 'dotenv';
import { createDatabase } from './index';
import { seedCatalog } from './catalog';
config({ path: '.env.development', quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const db = createDatabase(process.env.DATABASE_URL);
seedCatalog(db)
  .then(() => console.log('Seeded 13 strength and 7 cardio catalog entries.'))
  .catch(() => {
    console.error(
      'Catalog seed failed. Check database availability and migrations.',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
