const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'conest_db';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASS || '';
const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT || 3306;

console.log(`Attempting to connect to database using:`);
console.log(`- Dialect: mysql`);
console.log(`- Host: ${host}`);
console.log(`- Port: ${port}`);
console.log(`- User: ${user}`);
console.log(`- Password: ${password ? '********' : '(blank)'}`);
console.log(`- Database Name: ${dbName}`);

const sequelize = new Sequelize(dbName, user, password, {
  host: host,
  port: port,
  dialect: 'mysql',
  logging: false
});

async function test() {
  try {
    await sequelize.authenticate();
    console.log('\n✅ SUCCESS: Connection has been established successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR: Unable to connect to the database.');
    console.error(`Reason: ${error.message}`);
    console.log('\n💡 Tip: Make sure your MySQL Server is running, and that DB_USER and DB_PASS in backend/.env match your credentials.');
    process.exit(1);
  }
}

test();
