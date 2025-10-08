# Guia de Deploy e Configuração

Este guia fornece instruções completas para configurar, desenvolver e fazer deploy da plataforma WhatsApp Business API em diferentes ambientes.

## 🚀 Configuração Inicial

### Pré-requisitos

```bash
# Node.js (versão 18+)
node --version

# PostgreSQL (versão 14+)
psql --version

# Docker (opcional, para desenvolvimento)
docker --version

# Git
git --version
```

### Clonagem e Instalação

```bash
# Clonar repositório
git clone <repository-url>
cd autowpp

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend
cd ../frontend
npm install

# Voltar para raiz
cd ..
```

## ⚙️ Configuração de Ambiente

### Backend (.env)

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/autowpp
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# WhatsApp Business API
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
WHATSAPP_WEBHOOK_URL=https://yourdomain.com/whatsapp/webhook

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000

# AI Configuration
AI_CONFIDENCE_THRESHOLD=70
AI_FALLBACK_MESSAGE="Desculpe, não consegui entender. Um atendente entrará em contato."

# Escalation Configuration
ESCALATION_LOW_CONFIDENCE_THRESHOLD=50
ESCALATION_CONSECUTIVE_LOW_CONFIDENCE=3

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Google Cloud Storage (opcional)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Health Check
HEALTH_CHECK_TIMEOUT=5000
```

### Frontend (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=10000

# WhatsApp Configuration
NEXT_PUBLIC_WHATSAPP_WEBHOOK_URL=https://yourdomain.com/whatsapp/webhook

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_TRAINING=true
NEXT_PUBLIC_ENABLE_PRODUCT_MANAGEMENT=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# UI Configuration
NEXT_PUBLIC_APP_NAME="AutoWPP"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourcompany.com

# Analytics (opcional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
```

## 🗄️ Configuração do Banco de Dados

### PostgreSQL Local

```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Criar usuário e banco
sudo -u postgres psql
CREATE USER autowpp_user WITH PASSWORD 'your_password';
CREATE DATABASE autowpp OWNER autowpp_user;
GRANT ALL PRIVILEGES ON DATABASE autowpp TO autowpp_user;
\q

# Testar conexão
psql -h localhost -U autowpp_user -d autowpp
```

### Docker PostgreSQL

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: autowpp
      POSTGRES_USER: autowpp_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
# Iniciar serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

### Migrações e Seeds

```bash
# Executar migrações
cd backend
npm run db:migrate

# Executar seeds
npm run db:seed

# Verificar no Drizzle Studio
npm run db:studio
```

## 🔧 WhatsApp Business API Setup

### 1. Configurar Aplicativo Facebook

```bash
# 1. Acesse https://developers.facebook.com/
# 2. Crie um novo aplicativo
# 3. Adicione o produto "WhatsApp Business API"
# 4. Configure o webhook URL: https://yourdomain.com/whatsapp/webhook
# 5. Configure o verify token (mesmo do .env)
```

### 2. Obter Credenciais

```javascript
// Credenciais necessárias:
const credentials = {
  phoneNumberId: 'PHONE_NUMBER_ID', // Do painel do Facebook
  accessToken: 'ACCESS_TOKEN',       // Token de acesso permanente
  webhookVerifyToken: 'VERIFY_TOKEN', // Token de verificação do webhook
  businessName: 'Sua Empresa',
  phoneNumber: '+5511999999999'
};
```

### 3. Testar Integração

```bash
# Testar webhook
curl -X GET "https://yourdomain.com/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING"

# Deve retornar: CHALLENGE_STRING
```

## 🚀 Desenvolvimento

### Scripts Disponíveis

```bash
# Backend
cd backend

# Desenvolvimento
npm run start:dev          # Modo desenvolvimento com watch
npm run start:debug        # Modo debug
npm run build              # Build para produção
npm run start:prod         # Executar build de produção

# Banco de dados
npm run db:generate        # Gerar migrações
npm run db:migrate         # Executar migrações
npm run db:push           # Push schema (dev only)
npm run db:studio         # Abrir Drizzle Studio
npm run db:seed           # Executar seeds
npm run db:reset          # Reset completo

# Testes
npm run test              # Testes unitários
npm run test:watch        # Testes em modo watch
npm run test:e2e          # Testes end-to-end
npm run test:cov          # Coverage report

# Qualidade de código
npm run lint              # ESLint
npm run lint:fix          # Fix automático
npm run format            # Prettier
```

```bash
# Frontend
cd frontend

# Desenvolvimento
npm run dev               # Servidor de desenvolvimento
npm run build             # Build para produção
npm run start             # Servidor de produção
npm run lint              # ESLint
npm run type-check        # Verificação de tipos
```

### Estrutura de Desenvolvimento

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Banco de dados (opcional)
cd backend
npm run db:studio

# Terminal 4 - Logs (opcional)
tail -f backend/logs/app.log
```

## 🌐 Deploy em Produção

### 1. Preparação

```bash
# Build do backend
cd backend
npm run build

# Build do frontend
cd frontend
npm run build

# Verificar builds
ls -la backend/dist/
ls -la frontend/.next/
```

### 2. Deploy com PM2

```bash
# Instalar PM2
npm install -g pm2

# Configurar ecosystem
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'autowpp-backend',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'autowpp-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};

# Iniciar aplicações
pm2 start ecosystem.config.js --env production

# Verificar status
pm2 status
pm2 logs
pm2 monit
```

### 3. Deploy com Docker

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY dist/ ./dist/
COPY src/database/migrations/ ./src/database/migrations/

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "dist/main.js"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci --only=production

# Copiar build
COPY .next/ ./.next/
COPY public/ ./public/
COPY next.config.ts ./

# Expor porta
EXPOSE 3001

# Comando de inicialização
CMD ["npm", "start"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://backend:3000
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: autowpp
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### 4. Configuração Nginx

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    upstream frontend {
        server frontend:3001;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WhatsApp Webhook
        location /whatsapp/webhook {
            proxy_pass http://backend/whatsapp/webhook;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 📊 Monitoramento e Logs

### 1. Configuração de Logs

```typescript
// backend/src/config/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.File({
      filename: 'logs/app.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});
```

### 2. Health Checks

```bash
# Verificar saúde da aplicação
curl http://localhost:3000/health

# Verificar saúde do banco
curl http://localhost:3000/database/health

# Verificar saúde do WhatsApp
curl http://localhost:3000/whatsapp/health
```

### 3. Métricas com Prometheus

```typescript
// backend/src/metrics/prometheus.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route']
  });

  private readonly whatsappMessagesTotal = new Counter({
    name: 'whatsapp_messages_total',
    help: 'Total number of WhatsApp messages',
    labelNames: ['type', 'status']
  });

  private readonly aiConfidenceScore = new Histogram({
    name: 'ai_confidence_score',
    help: 'AI confidence scores',
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  });

  getMetrics() {
    return register.metrics();
  }
}
```

## 🔒 Segurança

### 1. Variáveis de Ambiente Seguras

```bash
# Usar ferramentas como dotenv-vault ou AWS Secrets Manager
npm install @dotenv-org/dotenv-vault

# Criptografar .env
npx dotenv-vault encrypt

# Deploy com secrets
npx dotenv-vault deploy
```

### 2. Rate Limiting

```typescript
// backend/src/config/rate-limit.config.ts
import { ThrottlerModule } from '@nestjs/throttler';

export const rateLimitConfig = ThrottlerModule.forRoot({
  ttl: 60, // 1 minuto
  limit: 100, // 100 requests por minuto
});
```

### 3. CORS e Helmet

```typescript
// backend/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Segurança
  app.use(helmet());
  
  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true
  });
  
  await app.listen(3000);
}
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Banco
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -h localhost -U autowpp_user -d autowpp

# Verificar logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 2. Webhook não Funcionando
```bash
# Verificar se URL está acessível
curl -X GET "https://yourdomain.com/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"

# Verificar logs do nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Verificar certificado SSL
openssl s_client -connect yourdomain.com:443
```

#### 3. Performance Issues
```bash
# Verificar uso de recursos
htop
iotop

# Verificar logs de performance
pm2 logs autowpp-backend --lines 100

# Verificar métricas do banco
psql -d autowpp -c "SELECT * FROM pg_stat_activity;"
```

#### 4. Problemas de Build
```bash
# Limpar cache
npm run clean
rm -rf node_modules package-lock.json
npm install

# Verificar versões
node --version
npm --version

# Build com logs detalhados
npm run build --verbose
```

## 📋 Checklist de Deploy

### Pré-Deploy
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados configurado e migrado
- [ ] WhatsApp Business API configurado
- [ ] SSL/TLS configurado
- [ ] Backups configurados
- [ ] Monitoramento configurado

### Deploy
- [ ] Build do backend executado
- [ ] Build do frontend executado
- [ ] Testes passando
- [ ] Migrações executadas
- [ ] Seeds executados (se necessário)
- [ ] Aplicação iniciada
- [ ] Health checks passando

### Pós-Deploy
- [ ] Webhook funcionando
- [ ] Envio de mensagens funcionando
- [ ] IA respondendo corretamente
- [ ] Métricas sendo coletadas
- [ ] Logs sendo gerados
- [ ] Alertas configurados
- [ ] Documentação atualizada

## 📞 Suporte

### Logs Importantes
```bash
# Logs da aplicação
tail -f backend/logs/app.log

# Logs do PM2
pm2 logs

# Logs do sistema
journalctl -u autowpp-backend -f

# Logs do nginx
tail -f /var/log/nginx/access.log
```

### Comandos de Diagnóstico
```bash
# Status dos serviços
pm2 status
systemctl status postgresql
systemctl status nginx

# Verificar portas
netstat -tlnp | grep :3000
netstat -tlnp | grep :5432

# Verificar espaço em disco
df -h
du -sh /var/log/*

# Verificar memória
free -h
```

Este guia fornece uma base sólida para configurar, desenvolver e fazer deploy da plataforma WhatsApp Business API com segurança e eficiência.