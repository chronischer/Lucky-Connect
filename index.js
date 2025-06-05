require("dotenv").config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', './views');

const routes = path.join(__dirname, 'routes');
fs.readdirSync(routes).forEach(file => {
  const route = require(path.join(routes, file));
  app.use(route);
});

app.listen(port, () => {
  console.log(`Servidor rodando em localhost:${port}`);
});