# Teste de Perfil de Inteligência e Carreira

Projeto estático e mobile-first para captação de leads interessados em cursos profissionalizantes.

## Publicação

Publique index.html, styles.css e script.js juntos no GitHub Pages, Netlify, Vercel ou hospedagem da instituição.

## Antes de publicar

1. Em script.js, troque teamWhatsapp pelo número oficial.
2. Em index.html, personalize a marca provisória PróximoPasso.
3. Confirme a URL do Apps Script em `SHEETS_WEB_APP_URL`.
4. Configure a chave e a lista do Brevo nas propriedades do Apps Script.
5. Confira o Pixel da Meta e adicione Google Analytics, se desejar.

O cadastro é enviado após a terceira pergunta, com status **Em andamento**. Ao
terminar o teste, a mesma linha é atualizada para **Concluído**, sem criar outro
lead. Como segurança adicional, os dados também ficam no `localStorage` do
navegador, na chave `careerQuizLeads`.


## Integração com Google Sheets

1. Crie ou abra a planilha que receberá os leads.
2. Acesse **Extensões > Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole todo o conteúdo de `google-apps-script.gs` deste projeto.
4. Clique em **Implantar > Nova implantação**.
5. Em **Selecionar tipo**, escolha **Aplicativo da Web**.
6. Configure **Executar como: Eu** e **Quem pode acessar: Qualquer pessoa**.
7. Clique em **Implantar**, autorize o acesso e copie a URL terminada em `/exec`.
8. Em `script.js`, coloque essa URL em `SHEETS_WEB_APP_URL`.
9. Envie um cadastro de teste. A aba **Leads** será criada automaticamente.

Ao alterar o Apps Script no futuro, use **Implantar > Gerenciar implantações > Editar > Nova versão**. Salvar o código sem criar uma nova versão não atualiza a integração publicada.

## Integração com o Brevo

O envio ao Brevo acontece no Apps Script para que a chave secreta não fique
exposta no site ou no GitHub.

1. No projeto do Apps Script, abra **Configurações do projeto**.
2. Em **Propriedades do script**, adicione `BREVO_API_KEY` com a chave da API.
3. Adicione `BREVO_LIST_ID` com o mesmo ID numérico da lista usada pelo quiz
   gastronômico.
4. No editor, selecione a função `authorizeBrevo`, clique em **Executar** e
   autorize o acesso quando o Google solicitar.
5. Publique uma **nova versão** da implantação do Aplicativo da Web.

A planilha recebe automaticamente as colunas **E-mail** e **Brevo**. A coluna
Brevo mostra `Enviado` ou o motivo da falha, facilitando o diagnóstico.
