import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bd from "./src/models/index.js";
import redis from "./src/redis/index.js";

dotenv.config();

const { Task } = bd;

// Testa a conexão com o banco de dados
try {
  await bd.sequelize.authenticate();
  console.log("Conexão com o banco de dados estabelecida com sucesso.");
} catch (error) {
  console.error("Erro ao conectar ao banco de dados:", error);
  process.exit(1);
}

const app = express();
const port = 3000;

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

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Database is running on port ${process.env.DB_PORT}`);
});