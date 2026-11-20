# Próspera Sistemas Ambientais Inteligentes

Site de página única da Próspera (Mateus Generoso): mapeamento aéreo com drone,
geoprocessamento e planejamento ambiental regenerativo.

Publicado em https://prospera-ambiental.netlify.app (endereço provisório).

## Estrutura

- `site/` é a pasta publicada. HTML, CSS e JavaScript puros, sem etapa de build.
  - `index.html`: conteúdo, metadados de SEO e dados estruturados (JSON-LD).
  - `css/main.css`: estilos. Cores e tipografia saem do logo (sol, folha, floresta).
  - `js/main.js`: movimento da página (GSAP + ScrollTrigger em `js/vendor/`).
  - `js/data.js`: geometria do mapa ilustrativo e do mapa do Brasil.
  - `obrigado/` e `404.html`: páginas de apoio.
- `netlify.toml`: pasta publicada e cabeçalhos HTTP.

## Rodar localmente

```bash
python3 -m http.server 8080 -d site
```

## Formulário

O formulário de orçamento usa Netlify Forms (`name="orcamento"`). Os envios
aparecem no painel do Netlify, em Forms; as notificações por e-mail são
configuradas lá.

## Ao trocar para o domínio definitivo

Substituir `https://prospera-ambiental.netlify.app` em `site/index.html`
(canonical, Open Graph e JSON-LD), `site/robots.txt` e `site/sitemap.xml`.
Depois, acrescentar ao `netlify.toml` um redirecionamento 301 do endereço
provisório para o domínio novo e enviar o sitemap no Google Search Console.

## Publicação

O projeto `prospera-ambiental` no Netlify recebe deploys manuais (não está
ligado a este repositório). Para publicar a partir de uma máquina com o
Netlify CLI autenticado:

```bash
netlify deploy --prod --dir site --site prospera-ambiental
```
