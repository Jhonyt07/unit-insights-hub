## Objetivo

Centralizar a gestão de permissões (aprovação de usuários, papéis e filiais) diretamente no painel de Usuários do Lovable Cloud, removendo a tela `/admin/usuarios` do app.

## O que muda no app

- **Remover página**: `src/pages/admin/Usuarios.tsx`.
- **Remover rota** `/admin/usuarios` e seu link de navegação em `src/components/AppLayout.tsx` (e qualquer referência em `src/App.tsx`).
- **Manter** `/admin/upload` (upload de Excel) e a aba de "Meses Habilitados" — esta última será movida para uma nova página `src/pages/admin/Meses.tsx` (continua sendo controle operacional, não de permissão).
- Atualizar `PendingApproval.tsx` para instruir: "Solicite ao administrador que aprove seu acesso pelo painel Cloud → Users".

## Como você vai gerenciar pelo Cloud

No painel **Cloud → Users** e nas tabelas do banco:

1. **Aprovar/Rejeitar usuário** → tabela `profiles`, coluna `status` (`pending` → `approved` ou `rejected`).
2. **Definir papel** → tabela `user_roles`, inserir linha com `user_id` + `role` (`admin`, `editor` ou `leitor`). Para trocar, apague a linha antiga e insira a nova.
3. **Liberar filiais** → tabela `user_filiais`, inserir uma linha por filial permitida (`user_id` + `filial_id`). Admin enxerga tudo automaticamente.

As RLS já existentes garantem que só admins conseguem editar essas tabelas.

## Detalhes técnicos

- Arquivos a deletar: `src/pages/admin/Usuarios.tsx`.
- Arquivos a editar:
  - `src/App.tsx` — remover import e `<Route path="/admin/usuarios">`; adicionar rota `/admin/meses`.
  - `src/components/AppLayout.tsx` — substituir item "Usuários" do menu admin por "Meses Habilitados".
  - `src/pages/PendingApproval.tsx` — texto orientando aprovação via Cloud.
- Arquivo a criar: `src/pages/admin/Meses.tsx` extraindo a aba de meses habilitados do arquivo antigo.
- Nenhuma mudança de schema ou RLS é necessária.
