# Use a imagem oficial do Node.js como base
FROM node:18-alpine

# Instala ferramentas necessárias (bash, cliente PostgreSQL e dependências do bcrypt)
RUN apk add --no-cache bash postgresql-client python3 make g++

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências (incluindo devDependencies para sequelize-cli)
RUN npm ci

# Copia o código fonte da aplicação
COPY . .

# Converte terminações de linha do start.sh para Unix e torna executável
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Expõe a porta que a aplicação usa
EXPOSE 3000

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Sobrescreve o entrypoint padrão para executar diretamente o script
ENTRYPOINT []

# Comando para iniciar a aplicação (executa migrations e inicia servidor)
CMD ["/bin/bash", "./start.sh"]

