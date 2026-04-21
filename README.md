# Retail Service KPIs · Dr. Batalhão

Site didático e **100% estático** (HTML + CSS + JS puro) para ensinar Gestão de Varejo de Serviços, com framework padrão **Harvard Business School / MIT Sloan / London Business School**.

## ✨ Funcionalidades

- **Dashboard** com 12 KPIs (NPS, CSAT, Retenção, Churn, LTV, CAC, LTV/CAC, Ticket Médio, Conversão, FCR, Tempo Médio, Produtividade).
- **Formulário** com dados do estudo de caso.
- **Semáforo automático** (verde / amarelo / vermelho) com faixas recomendadas pela literatura.
- **Gráficos interativos** (Chart.js) por camada: Cliente · Financeira · Operacional.
- **Diagnóstico inteligente** com recomendações gerenciais automáticas.
- **Referencial teórico** com todas as fórmulas.
- Totalmente **responsivo** (mobile / tablet / desktop).
- Botão **"Preencher com exemplo"** para demonstração em sala.

## 🚀 Como hospedar GRÁTIS e SEM LIMITE DE TEMPO (GitHub Pages)

**Recomendado:** GitHub Pages é gratuito, sem cartão, sem limite de tempo, SSL automático e domínio `https://seu-usuario.github.io/batalhao/`.

### Passo a passo

1. **Criar conta** no GitHub (grátis): https://github.com/signup
2. **Criar um novo repositório** chamado, por exemplo, `batalhao-kpis` (público).
3. No terminal, dentro desta pasta (`d:\Projetos\batalhao`):
   ```powershell
   git init
   git add .
   git commit -m "Site KPIs Dr. Batalhão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/batalhao-kpis.git
   git push -u origin main
   ```
4. No GitHub: **Settings → Pages → Branch: `main` / root → Save**.
5. Aguarde ~1 minuto. O site estará no ar em:
   `https://SEU-USUARIO.github.io/batalhao-kpis/`

### Alternativas também 100% gratuitas

| Serviço           | Limite de tempo | Observação                                |
|-------------------|-----------------|-------------------------------------------|
| **GitHub Pages**  | ✅ Ilimitado    | Recomendado (este guia)                   |
| **Cloudflare Pages** | ✅ Ilimitado | Conecta ao GitHub, deploy automático      |
| **Netlify**       | ✅ Ilimitado    | Arraste a pasta em https://app.netlify.com/drop |
| **Vercel**        | ✅ Ilimitado    | Import do GitHub em https://vercel.com    |

### Opção mais simples (sem Git): Netlify Drop

1. Acesse https://app.netlify.com/drop
2. Arraste a pasta `batalhao` inteira para a página.
3. Pronto — URL pública gerada na hora.

## 📂 Estrutura

```
batalhao/
├── index.html        # Estrutura + 5 abas (Dashboard, Entrada, Resultados, Diagnóstico, Teoria)
├── css/styles.css    # Design responsivo
├── js/app.js         # Fórmulas, semáforo, gráficos, diagnóstico
└── README.md
```

## 🧮 Fórmulas implementadas

| KPI            | Fórmula                                           |
|----------------|---------------------------------------------------|
| NPS            | %Promotores − %Detratores                         |
| CSAT           | (satisfeitos / total de respostas) × 100          |
| Retenção       | ((Finais − Novos) / Iniciais) × 100               |
| Churn          | (Perdidos / Totais) × 100                         |
| LTV            | (Receita média × Margem) / Churn                  |
| CAC            | Marketing / Clientes adquiridos                   |
| LTV/CAC        | LTV / CAC (ideal ≥ 3)                             |
| Ticket médio   | Receita / Nº vendas                               |
| Conversão      | (Vendas / Atendimentos) × 100                     |
| FCR            | Resolvidos 1º contato / Total                     |
| Tempo médio    | Σ tempo / Nº atendimentos                         |
| Produtividade  | Receita / Nº funcionários                         |

## 📚 Referencial

- Reichheld, F. — *The Ultimate Question 2.0* (Harvard Business Review Press).
- Fitzsimmons & Fitzsimmons — *Service Management* (MIT / McGraw-Hill).
- Heskett, Sasser, Schlesinger — *The Service Profit Chain* (Harvard).
