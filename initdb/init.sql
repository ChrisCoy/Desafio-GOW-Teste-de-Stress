CREATE TABLE IF NOT EXISTS programadores (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  apelido VARCHAR(32) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  nascimento VARCHAR(10) NOT NULL,
  stack TEXT[]
);