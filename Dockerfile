# syntax=docker/dockerfile:1
FROM node:20-alpine

# 1. Diretório de trabalho
WORKDIR /usr/src/app

# 2. Instala somente as dependências de runtime
COPY package*.json ./
RUN npm ci --only=production

# 3. Copia o restante do código
COPY api.js .

# 4. Porta padrão (ajuste se precisar)
ENV PORT=80
EXPOSE 80

# 5. Sobe a API
CMD ["node", "api.js"]