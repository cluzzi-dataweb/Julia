# Plataforma de Estudos Universitarios

Aplicativo de planejamento de estudos com interface React, disponivel em modo desktop com Electron e em modo web com deploy estatico na Vercel.

## Stack

- Electron
- React + TypeScript + Vite
- lowdb (JSON local para persistencia no desktop)
- localStorage (persistencia no navegador)
- react-calendar

## Funcionalidades

1. Calendario para agendar estudos e revisoes por data.
2. Cadastro de disciplinas.
3. Registro de topico estudado com data e frequencia base de revisao em dias.
4. Algoritmo de revisao com reprogramacao automatica de proxima revisao.
5. Lista de tarefas de proximas revisoes, com destaque para itens vencidos.
6. Quadro kanban de tarefas.
7. Anotacoes livres.
8. Timer pomodoro com historico de sessoes.
9. Alertas de revisao proxima quando a notificacao estiver permitida.

## Modos de Execucao

- Desktop: usa Electron + lowdb e salva os dados em um arquivo JSON local no diretorio de dados do usuario.
- Web: usa a mesma interface React e salva os dados no localStorage do navegador.

## Base de Dados

Colecoes:
- disciplines: disciplinas cadastradas.
- topics: topicos estudados com proxima revisao e historico de repeticoes.
- studyPlans: eventos de estudo e revisao no calendario.
- tasks: tarefas do quadro kanban.
- notes: anotacoes livres.
- pomodoroSessions: historico de sessoes de foco.

Regra de revisao:
- Ao registrar um topico, a proxima revisao e calculada com base na frequencia inicial.
- Ao marcar um topico como revisado, o contador de repeticoes aumenta e o proximo intervalo cresce por fator aproximado de 1.8.

## Scripts

- npm run dev: interface web com Vite.
- npm run dev:desktop: app desktop com Vite + Electron.
- npm run build: build de producao para a versao web.
- npm run start: inicia o shell Electron carregando a pasta dist.
- npm run preview: sobe o build web localmente para validacao.

## Executar

1. Instalar dependencias:

```bash
npm install
```

2. Modo web:

```bash
npm run dev
```

3. Modo desktop:

```bash
npm run dev:desktop
```

4. Build web:

```bash
npm run build
```

## Deploy na Vercel

1. Importe o projeto na Vercel.
2. Mantenha o preset como Vite.
3. Use npm run build como build command.
4. Use dist como output directory.
5. Publique.

O arquivo vercel.json ja deixa essa configuracao explicita no repositorio.

## Observacao Importante

No deploy web, os dados ficam no navegador de cada usuario. Se voce quiser login, sincronizacao entre dispositivos ou backup centralizado, o proximo passo e substituir essa API local por um backend real.

## Lembretes no Telegram (gratis)

A versao web inclui envio de lembretes para Telegram usando uma Function da Vercel em `api/telegram-send.js`.

Passos para ativar:

1. Crie um bot no Telegram com o BotFather e copie o token.
2. No projeto da Vercel, adicione a variavel de ambiente `TELEGRAM_BOT_TOKEN` com esse token.
3. No app, na tela de Calendario, informe o `Chat ID` no campo de Telegram e clique em `Salvar`.
4. Use `Testar` para validar o envio.
5. Os lembretes sao enviados automaticamente quando um evento entra na janela configurada (5, 15, 30 ou 60 min).

Observacoes:
- Sem token configurado na Vercel, o envio retorna erro.
- O usuario precisa iniciar conversa com o bot ao menos uma vez para receber mensagens.
