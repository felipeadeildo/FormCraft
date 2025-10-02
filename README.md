# FormCraft POC

Aplicação POC que permite criar formulários com linguagem natural e responder através de chat conversacional.

## Configuração

1. **Instalar dependências:**
   ```bash
   bun install
   ```

2. **Configurar Supabase:**
   - Crie um arquivo `.env.local` na raiz do projeto:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```

3. **Configurar OpenAI API Key:**
   - No Dashboard do Supabase → Edge Functions → Secrets
   - Adicione: `OPENAI_API_KEY=sk-...`

4. **Executar:**
   ```bash
   bun run dev
   ```

## Funcionalidades

- ✅ **Criar formulários:** Descreva em linguagem natural, gere JSON Schema automaticamente
- ✅ **Edge Functions:** `generate-schema` e `nlu-map` deployadas
- ✅ **Autenticação:** Magic Link
- ✅ **UI:** shadcn/ui com Tailwind CSS
- ✅ **Banco:** Supabase Postgres com RLS

## Próximos passos

- [ ] Chat de resposta com autosave
- [ ] Validação com ajv
- [ ] Métricas de abandono
