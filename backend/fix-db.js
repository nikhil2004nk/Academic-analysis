const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'academics_db',
    });

    console.log('Connected to DB. Updating old admin roles to superadmin...');
    const [result] = await connection.execute(
      `UPDATE users SET role = 'superadmin' WHERE role = 'admin'`
    );
    console.log(`Updated ${result.affectedRows} rows.`);

    await connection.end();
    console.log('Database fix complete.');
  } catch (err) {
    console.error('Error fixing db:', err);
  }
}

fixDb();
