require("dotenv").config({ path: "./api-gateway/.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.RDS_HOSTNAME,
  port: process.env.RDS_PORT,
  database: process.env.RDS_DB_NAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false }, // REQUIRED for RDS
});

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Database connected");
    console.log("Time:", res.rows[0].now);

    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    );

    console.log("\n📦 Tables:");
    tables.rows.forEach((t) => console.log("-", t.tablename));

    await pool.end();
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
})();
