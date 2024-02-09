/** add files to PostgreSql database */

import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const DB_password = process.env.DB_PASSWORD

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'DB_NAME_HERE',
  password: DB_password,
  port: 5432,
});

const loadPDFs = async () => {
  // Get all PDF filenames in a directory
  const pdfDirectory = 'UserDocs'; // Replace with your PDF directory
  const files = fs.readdirSync(pdfDirectory);
  const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

  // Insert each PDF filename into the database
  for (const pdfFile of pdfFiles) {
    await pool.query('INSERT INTO UserDocs (title) VALUES ($1)', [pdfFile]);
  }
};

loadPDFs().catch(console.error);
