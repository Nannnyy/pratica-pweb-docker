import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import bd from "./src/models/index.js";
import redis from "./src/redis/index.js";

dotenv.config();

const { Task, User } = bd;

// Testa a conexão com o banco de dados
try {
  await bd.sequelize.authenticate();
  console.log("Conexão com o banco de dados estabelecida com sucesso.");
} catch (error) {
  console.error("Erro ao conectar ao banco de dados:", error);
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado nas variáveis de ambiente");
}

const toUserResponse = (userInstance) => {
  const safeUser = userInstance?.toJSON?.() ?? userInstance;
  return {
    id: safeUser.id,
    name: safeUser.name,
    email: safeUser.email,
    photo: safeUser.photoUrl ?? null,
  };
};

const generateTokens = (userInstance) => {
  const payload = { sub: userInstance.id, email: userInstance.email };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  return {
    user: toUserResponse(userInstance),
    accessToken,
    refreshToken,
  };
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch (error) {
    console.error("Erro ao validar token:", error);
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});

app.get("/tasks", async (req, res) => {
  try {
    const cacheKey = "tasks:list";
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("Cache Hit: /tasks");
      return res.json(JSON.parse(cached));
    }
    console.log("Cache Miss: /tasks");
    const tasks = await Task.findAll();
    await redis.set(cacheKey, JSON.stringify(tasks), "EX", 60); // cache por 60s
    res.json(tasks);
  } catch (err) {
    console.error("Erro no cache /tasks:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/tasks", async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "Descrição obrigatória" });
  const task = await Task.create({ description, completed: false });
  await redis.del("tasks:list"); // Limpa cache
  res.status(201).json(task);
});

app.get("/tasks/:id", async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
  res.json(task);
});

app.put("/tasks/:id", async (req, res) => {
  const { description, completed } = req.body;
  const task = await Task.findByPk(req.params.id);
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
  await task.update({ description, completed });
  await redis.del("tasks:list"); // Limpa cache
  res.json(task);
});

app.delete("/tasks/:id", async (req, res) => {
  const deleted = await Task.destroy({ where: { id: req.params.id } });
  if (!deleted) return res.status(404).json({ error: "Tarefa não encontrada" });
  await redis.del("tasks:list"); // Limpa cache
  res.status(204).send();
});

app.post("/signup", async (req, res) => {
  try {
    console.error("Entrou aqui")
    const { name, email, password, photo } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: "E-mail já registrado" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      photoUrl: photo ?? null,
    });

    const authPayload = generateTokens(user);
    return res.status(201).json(authPayload);
  } catch (error) {
    console.error("Erro no signup:", error);
    return res.status(500).json({ error: "Erro ao registrar usuário" });
  }
});

app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const authPayload = generateTokens(user);
    return res.json(authPayload);
  } catch (error) {
    console.error("Erro no signin:", error);
    return res.status(500).json({ error: "Erro ao autenticar usuário" });
  }
});

app.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    return res.json(toUserResponse(user));
  } catch (error) {
    console.error("Erro ao carregar profile:", error);
    return res.status(500).json({ error: "Erro ao carregar perfil" });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Database is running on port ${process.env.DB_PORT}`);
});