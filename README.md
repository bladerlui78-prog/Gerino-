# Gerino — encurtador com página de transição

Projeto inicial funcional em Node.js + Express. Inclui criação de links curtos, página de transição com contagem regressiva de 10 segundos, anúncios demonstrativos, contagem de cliques e endpoint de estatísticas protegido por chave.

## Executar localmente

1. Instale Node.js 18 ou superior.
2. Extraia o ZIP e abra um terminal nesta pasta.
3. Execute `npm install`.
4. Copie `.env.example` para `.env` e configure `ADMIN_KEY` e, se necessário, `BASE_URL`.
5. Execute `npm start`.
6. Abra `http://localhost:3000`.

O arquivo `data/links.json` guarda os links. Use hospedagem com armazenamento persistente; sistemas de arquivos efêmeros podem apagar os dados ao reiniciar.

## Colocar no ar

Use um serviço que aceite aplicações Node.js (por exemplo, Render, Railway ou uma VPS), conecte o repositório ou envie os arquivos, defina o comando de instalação `npm install` e o comando de início `npm start`. Configure as variáveis `BASE_URL` e `ADMIN_KEY`, habilite HTTPS e use armazenamento persistente para `data/links.json`. Para domínio próprio, configure o DNS conforme as instruções da hospedagem.

## Publicidade

Os anúncios incluídos são apenas espaços demonstrativos e **não geram receita**. Para monetizar, substitua os blocos marcados no HTML por códigos de uma rede publicitária que tenha aprovado o site e confirme que o formato de página de transição/encurtador é permitido pelos termos da rede. Não simule cliques, não peça que usuários cliquem em anúncios e mantenha os anúncios claramente identificados. A receita depende do tráfego válido e da aprovação da rede.

## Segurança e limitações desta versão

- Valida URLs HTTP/HTTPS e gera códigos aleatórios.
- Não inclui cadastro de usuários nem painel visual de administração.
- O armazenamento JSON é adequado para protótipo e tráfego pequeno; para produção, prefira PostgreSQL/MySQL, limite de requisições, logs, backups, moderação e proteção contra abuso.
- O botão de continuar só é habilitado após a contagem regressiva, mas a proteção contra automação pode ser reforçada no backend antes de uso em escala.
- Adicione política de privacidade, termos de uso e canal real de denúncias antes de abrir ao público.
