import fs from 'fs';
import path from 'path';
import pool from './connection';

async function migrate() {
  console.log('Running database migrations...');

  try {
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );

    await pool.query(schemaSQL);
    console.log('Migration completed successfully!');

    // Create a default team if none exists
    const result = await pool.query('SELECT COUNT(*) FROM teams');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query(
        `INSERT INTO teams (name, description, github_repos)
         VALUES ($1, $2, $3)`,
        ['Default Team', 'Default team for metrics tracking', []]
      );
      console.log('Created default team');
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
