# Teste de Perfil de Inteligência e Carreira

Projeto estático e mobile-first para captação de leads interessados em cursos profissionalizantes.

## Publicação

O projeto é publicado pelo GitHub no Cloudflare Pages. A pasta `functions/api`
cria a rota `/api/lead`, que envia os dados ao Apps Script e confirma a gravação
antes de iniciar o teste. A cópia no GitHub Pages usa essa mesma rota no domínio
`teste-de-perfil.pages.dev`.

Depois da publicação, use estes endereços nas configurações do aplicativo da Meta:

- Política de Privacidade: `https://teste-de-perfil.pages.dev/privacy.html`
- Exclusão de dados: `https://teste-de-perfil.pages.dev/exclusao-de-dados.html`

## Antes de publicar

1. Confirme se `teamWhatsapp` é o número oficial da unidade.
2. Confirme a URL do Apps Script em `functions/api/lead.js`.
3. Configure a chave e a lista do Brevo nas propriedades do Apps Script.
4. Confira o Pixel da Meta e adicione Google Analytics, se desejar.
5. Confirme por escrito as regras comerciais da oferta antes de anunciá-la.

O arquivo `microlins-logo.png` foi obtido do
[site oficial da Microlins](https://microlins.com.br/wp-content/uploads/2025/12/Logo-Microlins.png).

## Oferta após o resultado

Após a conclusão, o site recomenda o primeiro curso do perfil e exibe a
condição de matrícula de R$ 199 por R$ 1. O contador de 5 minutos é salvo no
navegador pelo WhatsApp informado e não reinicia ao atualizar a página quando
o armazenamento local está disponível. Se estiver bloqueado ou cheio, o prazo
é mantido apenas enquanto a página permanece aberta. Quando
o prazo termina, o botão passa a consultar disponibilidade com a equipe.

A promoção foi informada como autorizada pela unidade, válida para todos os
cursos oferecidos. O preço normal da matrícula é R$ 199 e o preço promocional
é R$ 1. Mensalidades, material didático e outros itens contratados são cobrados
separadamente.

Ao clicar no botão da oferta, a mesma linha do lead recebe automaticamente as
informações **Clicou no WhatsApp**, **Data do clique no WhatsApp** e
**Clique após o prazo**. O marcador registra a abertura do link, não confirma
que a mensagem foi enviada no WhatsApp.

O cadastro é enviado na tela inicial, antes da primeira pergunta, com status
**Em andamento**. O teste só começa após a confirmação do servidor. Se a
confirmação falhar, o botão permite tentar de novo com o mesmo ID. Ao terminar,
a mesma linha é atualizada para **Concluído**, sem criar outro lead. Como
segurança adicional, os dados também ficam no `localStorage` do navegador, na
chave `careerQuizLeads`, quando disponível.
Falhas nesse backup não impedem a tentativa de envio à planilha.


## Integração com Google Sheets

1. Crie ou abra a planilha que receberá os leads.
2. Acesse **Extensões > Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole todo o conteúdo de `google-apps-script.gs` deste projeto.
4. Clique em **Implantar > Nova implantação**.
5. Em **Selecionar tipo**, escolha **Aplicativo da Web**.
6. Configure **Executar como: Eu** e **Quem pode acessar: Qualquer pessoa**.
7. Clique em **Implantar**, autorize o acesso e copie a URL terminada em `/exec`.
8. Em `functions/api/lead.js`, coloque essa URL em `UPSTREAM`.
9. Envie um cadastro de teste. A aba **Leads** será criada automaticamente.

Ao alterar o Apps Script no futuro, use **Implantar > Gerenciar implantações > Editar > Nova versão**. Salvar o código sem criar uma nova versão não atualiza a integração publicada.

### Contagem diária da campanha

Execute `repairMetaAdsDailyCounts` para atualizar e verificar as fórmulas
existentes na aba **Meta Ads**, mesmo que a API da Meta esteja indisponível.
Quando houver várias campanhas no mesmo dia, os leads da planilha entram uma
única vez no total. As métricas que exigiriam atribuir esses leads a uma
campanha individual ficam vazias. Os limites da contagem usam o dia civil no
fuso da planilha, incluindo registros antigos cuja data continha horário.

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
