import crypto from "node:crypto";
import http from "node:http";
import { Pool } from "pg";

const apelidosCache = new Set();

const pg = new Pool({
  user: "postgres",
  host: "db",
  database: "challenge",
  password: "postgres",
  min: 1,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  maxLifetimeSeconds: 30,
});

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0] || "";

  switch (url) {
    case "/programadores":
      if (req.method !== "POST") {
        res.writeHead(405, { Allow: "POST" });
        res.end("Method Not Allowed");
        return;
      }

      const body = [];
      req.on("data", (chunk) => {
        body.push(chunk);
      });

      req.on("end", async () => {
        const requestBody = Buffer.concat(body).toString();
        const parsedBody = JSON.parse(requestBody);

        if (!parsedBody.apelido || !parsedBody.nome || !parsedBody.nascimento) {
          res.writeHead(400);
          res.end();
          return;
        }

        if (
          (parsedBody.apelido && typeof parsedBody.apelido !== "string") ||
          (parsedBody.nome && typeof parsedBody.nome !== "string") ||
          (parsedBody.nascimento &&
            typeof parsedBody.nascimento !== "string") ||
          (parsedBody.stack && !Array.isArray(parsedBody.stack))
        ) {
          res.writeHead(400);
          res.end();
          return;
        }

        if (
          parsedBody.apelido.length > 32 ||
          parsedBody.nome.length > 100 ||
          parsedBody.nascimento.length > 10 ||
          /[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(parsedBody.nascimento) === false
        ) {
          res.writeHead(400);
          res.end();
          return;
        }

        if (parsedBody.stack) {
          let isStackValid = true;
          for (let i = 0; i < parsedBody.stack.length; i++) {
            if (
              typeof parsedBody.stack[i] !== "string" ||
              parsedBody.stack[i].length > 32
            ) {
              isStackValid = false;
              break;
            }
          }

          if (!isStackValid) {
            res.writeHead(400);
            res.end();
            return;
          }
        }

        if (apelidosCache.has(parsedBody.apelido)) {
          res.writeHead(422);
          res.end();
          return;
        }

        const uuid = crypto.randomUUID();
        apelidosCache.add(parsedBody.apelido);

        try {
          await pg.query(
            "INSERT INTO programadores (id, apelido, nome, nascimento, stack) VALUES ($1, $2, $3, $4, $5)",
            [
              uuid.toString(),
              parsedBody.apelido,
              parsedBody.nome,
              parsedBody.nascimento,
              parsedBody.stack || [],
            ]
          );
        } catch (error) {
          res.writeHead(500);
          res.end();
          return;
        }

        res.writeHead(201, { location: `/programadores/${uuid.toString()}` });
        res.end(process.env.INSTANCE_ID);
      });
      break;

    case "/contagem-programadores":
      if (req.method !== "GET") {
        res.writeHead(405, { Allow: "GET" });
        res.end("Method Not Allowed");
        return;
      }

      try {
        const size = await pg.query("SELECT COUNT(*) FROM programadores");

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(size.rows[0].count.toString());
        return;
      } catch (error) {
        res.writeHead(500);
        res.end();
        return;
      }
      break;

    default:
      res.writeHead(404);
      res.end("Not Found");
      break;
  }
});

function simpleAsciiHash(str) {
  str = str.toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i);
  }
  return hash;
}

async function start() {
  try {
    // delay to ensure the database is ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await pg.connect();

    const apelidos = await pg.query("SELECT apelido FROM programadores");

    apelidos.rows.forEach((row) => {
      if (
        process.env.INSTANCE_ID === "first" &&
        simpleAsciiHash(row.apelido) % 2 === 0
      ) {
        apelidosCache.add(row.apelido);
      } else if (
        process.env.INSTANCE_ID === "second" &&
        simpleAsciiHash(row.apelido) % 2 !== 0
      ) {
        apelidosCache.add(row.apelido);
      }
    });

    console.log("Cache initialized with existing apelidos", apelidosCache);
  } catch (error) {
    console.error("Failed to connect to PostgreSQL database:", error);
    process.exit(1);
  }

  server.listen(80, () => {
    console.log("Server is running at http://localhost:80/");
  });
}

start();
