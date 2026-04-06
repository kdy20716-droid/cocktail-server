import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "qwer1234",
  database: "cocktail",
});

export default pool;
