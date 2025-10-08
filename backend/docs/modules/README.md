# Módulos da Plataforma WhatsApp Business API

Esta documentação fornece um guia abrangente de todos os módulos da plataforma de automação WhatsApp Business API.

## Visão Geral dos Módulos

A plataforma está organizada em módulos especializados que trabalham em conjunto para fornecer automação inteligente de conversas via WhatsApp:

### 🤖 [AI Module](./ai-module.md)
Sistema de inteligência artificial baseado em LangChain com OpenAI para processamento de mensagens, recomendações de produtos e gerenciamento de conversas.

### 💬 [Conversations Module](./conversations-module.md)
Gerenciamento completo de conversas, incluindo histórico de mensagens, status de conversas e escalação para revisão manual.

### 📱 [WhatsApp Module](./whatsapp-module.md)
Integração com WhatsApp Business API, incluindo webhook handling, envio/recebimento de mensagens e gerenciamento de credenciais.

### 🛍️ [Products Module](./products-module.md)
Catálogo de produtos com CRUD completo, upload de imagens, busca e filtragem para integração com o sistema de IA.

### 🗄️ [Database Module](./database-module.md)
Configuração e gerenciamento do banco de dados PostgreSQL com Drizzle ORM, migrações e seeding.

## Arquitetura Geral

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   AI Module     │    │   Products      │
│   Module        │◄──►│                 │◄──►│   Module        │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Conversations  │    │   Database      │    │   Config        │
│   Module        │◄──►│   Module        │◄──►│   Module        │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Fluxo Principal

1. **Recebimento de Mensagem**: WhatsApp Module recebe webhook
2. **Processamento**: AI Module processa a mensagem com contexto
3. **Busca de Produtos**: Products Module fornece recomendações
4. **Armazenamento**: Database Module persiste conversas e mensagens
5. **Resposta**: WhatsApp Module envia resposta automatizada

## Tecnologias Utilizadas

- **Backend**: NestJS com TypeScript
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **IA**: LangChain com OpenAI
- **Autenticação**: WhatsApp Business API
- **Criptografia**: crypto-js
- **Validação**: class-validator e class-transformer
- **Testes**: Jest

## Próximos Passos

Consulte a documentação específica de cada módulo para entender:
- Estrutura de arquivos
- Principais funcionalidades
- APIs disponíveis
- Exemplos de uso
- Configuração e deployment