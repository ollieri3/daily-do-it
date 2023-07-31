/**
 * Database Schema Setup
 */

import pg from "pg";

const client = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "dailydoit",
  password: "secret", // This will be changed before deployment
  port: 5432,
});

const createScript = `
  CREATE TABLE IF NOT EXISTS users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email varchar(200) NOT NULL,
    hashed_password varchar(255) NOT NULL,
    salt varchar(255) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS days (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    CONSTRAINT fk_user
      FOREIGN KEY(user_id)
        REFERENCES users(id)
  )
`;

client.connect().then(async () => {
  try {
    console.log("Creating Database schema...");
    await client.query(createScript);
    console.log("Database schema creation complete.");
  } catch (err) {
    console.log(err);
  } finally {
    client.end();
  }
});
