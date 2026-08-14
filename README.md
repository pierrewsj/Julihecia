# Julih & Cia — Pedidos e Gestão

Aplicativo web/PWA com duas áreas:

- **Cliente:** catálogo, carrinho, encomendas, pedidos personalizados e acompanhamento.
- **Confeitaria:** dashboard, pedidos, produção, produtos, estoque, despesas, financeiro e configurações.

## Arquivos

- `index.html` — entrada do aplicativo
- `styles.css` — identidade visual
- `app.js` — regras e telas
- `manifest.json` + `sw.js` — PWA/instalação no celular
- `assets/` — logo e ícones
- `google-apps-script.gs` — backend para Google Sheets

## Testar sem Google Sheets

O aplicativo já funciona em **modo local** usando o armazenamento do navegador.

1. Publique os arquivos em um site HTTPS (GitHub Pages, Netlify etc.) ou use um servidor local.
2. Acesse o endereço.
3. Área administrativa: PIN inicial **2026**.
4. Altere o PIN em **Configurações**.

## Conectar ao Google Sheets

1. Crie uma Planilha Google vazia.
2. Na planilha, abra **Extensões > Apps Script**.
3. Apague o conteúdo padrão e cole `google-apps-script.gs`.
4. Salve.
5. Execute `setupJulihCia()` uma vez e autorize o script.
6. Abra **Implantar > Nova implantação**.
7. Tipo: **Aplicativo da Web**.
8. Executar como: **Você**.
9. Quem pode acessar: **Qualquer pessoa com o link**.
10. Implante e copie a URL que termina em `/exec`.
11. No aplicativo, abra **Área da Confeitaria > Configurações**.
12. Cole a URL e use **Testar conexão**.
13. Salve e pressione **Sincronizar**.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. Abra **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Branch: `main` / pasta `/root`.
6. Salve e aguarde o endereço do GitHub Pages.

## Observações importantes

- O PIN desta versão protege a interface administrativa, mas não substitui um sistema de autenticação robusto.
- O Apps Script foi pensado para uma confeitaria pequena. Se houver crescimento relevante de usuários, pedidos ou necessidade de maior segurança, o backend pode ser migrado para Firebase/Supabase ou outro banco sem redesenhar a interface.
- Para trocar a logo ou cores, substitua os arquivos de `assets/` e ajuste as variáveis no início de `styles.css`.
