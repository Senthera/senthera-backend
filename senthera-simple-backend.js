const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = "AIzaSyBFTdnhsQYQ7gq_zzYXIZ4u8D622ch8N5o";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Lógica con Gemini para analizar el test de apego
app.post('/apego', async (req, res) => {
  const answers = req.body.answers || [];
  if (answers.length < 4) {
    return res.status(400).json({ error: "Debes responder todas las preguntas." });
  }
  const prompt = `Eres un psicólogo experto en apegos. Analiza las siguientes respuestas de un test de apego y responde en formato JSON con las claves: tipo, sesiones y tips. Respuestas del usuario: ${JSON.stringify(answers)}. Ejemplo de respuesta: {
  "tipo": "Ansioso",
  "sesiones": "5",
  "tips": "Trabaja en tu autoconfianza, identifica tus pensamientos ansiosos y comunícalos."
}`;
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const json = JSON.parse(match[0]);
      res.json(json);
    } else {
      res.status(500).json({ tipo: "Desconocido", sesiones: "No disponible", tips: "No se pudo analizar la respuesta con IA." });
    }
  } catch (e) {
    res.status(500).json({ tipo: "Desconocido", sesiones: "No disponible", tips: "Error al conectar con Gemini: " + e.message });
  }
});

// Endpoint de prueba para saber si el backend está vivo
app.get('/', (req, res) => {
  res.send('Backend de Senthera funcionando');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend de Senthera corriendo en http://localhost:${PORT}`);
});