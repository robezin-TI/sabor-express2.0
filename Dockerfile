# Usando Node.js para servir a aplicação
FROM node:18-alpine

# Cria a pasta de trabalho
WORKDIR /app

# Copia os arquivos do projeto
COPY . .

# Instala um servidor HTTP simples (serve)
RUN npm install -g serve

# Expõe a porta que será usada
EXPOSE 3000

# Comando para rodar o servidor
CMD ["serve", "-s", ".", "-l", "3000"]
