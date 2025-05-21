const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Conexión a MongoDB
const MONGO_URI = 'mongodb+srv://gio1307:<qBa8gpoA6XQedbEg>@cluster0.grznesl.mongodb.net/senthera?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
  console.log('Conectado a MongoDB');
});

// Esquema de usuario
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  selectedTheme: { type: Number, default: 0 }, // Tema seleccionado
});

const User = mongoose.model('User', userSchema);

// Ruta para registrar un usuario con Google
app.post('/google-signup', async (req, res) => {
  const { username, email } = req.body;

  try {
    // Verifica si el usuario ya está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'El usuario ya está registrado' });
    }

    // Crea un nuevo usuario
    const user = new User({ username, email });
    await user.save();

    res.status(201).send({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    res.status(500).send({ message: 'Error al registrar usuario', error: err });
  }
});

// Ruta para iniciar sesión con Google
app.post('/google-signin', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }

    res.status(200).send({
      message: 'Inicio de sesión exitoso',
      username: user.username,
      selectedTheme: user.selectedTheme,
    });
  } catch (err) {
    res.status(500).send({ message: 'Error al iniciar sesión', error: err });
  }
});

const DEEPSEEK_API_KEY = "sk-2296ba349e744724932cc6d49316d0fd";

// Ruta para analizar respuestas de apego y devolver resultado personalizado con DeepSeek
app.post('/apego', async (req, res) => {
  const answers = req.body.answers || [];
  console.log('Respuestas recibidas:', answers);

  const prompt = `
Eres un psicólogo experto en apegos. Analiza las siguientes respuestas de un test de apego y responde en formato JSON con las claves: tipo, sesiones y tips. 
Respuestas del usuario: ${JSON.stringify(answers)}.
Ejemplo de respuesta: 
{
  "tipo": "Ansioso",
  "sesiones": "5",
  "tips": "Trabaja en tu autoconfianza, identifica tus pensamientos ansiosos y comunícalos."
}
`;

  try {
    console.log('Enviando prompt a DeepSeek...');
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Eres un psicólogo experto en apegos." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Respuesta de DeepSeek:', response.data);
    const text = response.data.choices[0].message.content;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const json = JSON.parse(match[0]);
      res.json(json);
    } else {
      console.error('No se pudo extraer JSON de la respuesta:', text);
      res.status(500).json({ tipo: "Desconocido", sesiones: "No disponible", tips: "No se pudo analizar la respuesta con IA." });
    }
  } catch (e) {
    console.error('Error al conectar con DeepSeek:', e);
    res.status(500).json({ tipo: "Desconocido", sesiones: "No disponible", tips: "Error al conectar con DeepSeek: " + e.message });
  }
});

// Inicia el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});