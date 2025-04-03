require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const User = require('../Schemas/User');

const app = express();

app.use(express.json());
app.use(express.static('public'));

// Conecta ao MongoDB
mongoose
  .connect(process.env.MONGOURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

// Rota para registro de usuário
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: 'Usuário já existe' });
    
    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar o usuário' });
  }
});

// Rota para login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: 'Credenciais inválidas' });
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ error: 'Credenciais inválidas' });
    
    res.json({
      message: 'Login efetuado com sucesso',
      username: user.username,
      coinCount: user.coinCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro no login' });
  }
});

// Rota para atualizar moedas
app.post('/api/coins', async (req, res) => {
  try {
    const { username, increment } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: 'Usuário não encontrado' });
    
    user.coinCount += increment;
    await user.save();
    res.json({ coinCount: user.coinCount });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar moedas' });
  }
});

// Rota para compra de cores
app.post('/api/buyColor', async (req, res) => {
  try {
    const { username, color, price } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: 'Usuário não encontrado' });
    
    if (user.coinCount < price)
      return res.status(400).json({ error: 'Moedas insuficientes' });
    
    user.coinCount -= price;
    if (!user.inventory.includes(color)) {
      user.inventory.push(color);
    }
    await user.save();
    res.json({ coinCount: user.coinCount, inventory: user.inventory });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao comprar cor' });
  }
});

// Rota para obter dados do usuário
app.get('/api/user', async (req, res) => {
  try {
    const { username } = req.query;
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: 'Usuário não encontrado' });
    
    res.json({
      username: user.username,
      coinCount: user.coinCount,
      inventory: user.inventory,
      currentColor: user.currentColor || 'blue'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter dados do usuário' });
  }
});

// Se o arquivo for executado diretamente, inicia o servidor na porta definida
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
}

// Exporta o handler para a Vercel
module.exports = app;
module.exports.handler = serverless(app);
