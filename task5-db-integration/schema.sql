CREATE DATABASE IF NOT EXISTS saiket_internship;
USE saiket_internship;

CREATE TABLE IF NOT EXISTS users (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  age        INT          NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_age CHECK (age BETWEEN 1 AND 120)
);

INSERT INTO users (name, email, age) VALUES
  ('Alex Rivera',  'alex@example.com',  22),
  ('Priya Sharma', 'priya@example.com', 25),
  ('James Lee',    'james@example.com', 28);