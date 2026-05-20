#!/usr/bin/env bash
# -------------------------------------------------------
# Duplicates theageabundance-team/appageofabundance
# to a new repo called "spanish" in the same org.
# Usage: bash duplicate_to_spanish.sh
# -------------------------------------------------------

set -e

TOKEN="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"
ORG="theageabundance-team"
SOURCE_REPO="appageofabundance"
DEST_REPO="spanish"

echo "==> Obtendo username do token..."
USERNAME=$(curl -s \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin).get('login',''))" 2>/dev/null)
echo "    Usuário: $USERNAME"

echo ""
echo "==> Verificando orgs disponíveis..."
ORGS=$(curl -s \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/orgs | python3 -c "import sys,json; orgs=json.load(sys.stdin); [print('   -', o['login']) for o in orgs]" 2>/dev/null)
echo "$ORGS"

echo ""
echo "==> Verificando se repo '$DEST_REPO' já existe..."
# Tenta na org primeiro, depois na conta pessoal
CHECK_ORG=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $TOKEN" \
  https://api.github.com/repos/$ORG/$DEST_REPO)
CHECK_USER=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $TOKEN" \
  https://api.github.com/repos/$USERNAME/$DEST_REPO)

if [ "$CHECK_ORG" = "200" ]; then
  echo "    ✓ Repo já existe na org '$ORG'. Usando ele."
  PUSH_OWNER="$ORG"
elif [ "$CHECK_USER" = "200" ]; then
  echo "    ✓ Repo já existe na conta pessoal '$USERNAME'. Usando ele."
  PUSH_OWNER="$USERNAME"
else
  echo "    Criando repo '$DEST_REPO' na conta pessoal '$USERNAME'..."
  CREATE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$DEST_REPO\",\"private\":true}")
  CODE=$(echo "$CREATE" | tail -1)
  if [ "$CODE" = "201" ]; then
    echo "    ✓ Repo criado com sucesso."
    PUSH_OWNER="$USERNAME"
  else
    echo "    ✗ Falha ao criar (HTTP $CODE): $(echo "$CREATE" | sed '$d')"
    exit 1
  fi
fi

echo ""
echo "==> Step 2: Mirror-cloning source repo..."
TMPDIR=$(mktemp -d)
git clone --mirror "https://${TOKEN}@github.com/${ORG}/${SOURCE_REPO}.git" "$TMPDIR/mirror.git"
echo "    ✓ Cloned."

echo ""
echo "==> Step 3: Pushing all branches and tags to '$DEST_REPO'..."
cd "$TMPDIR/mirror.git"
git remote set-url --push origin "https://${TOKEN}@github.com/${PUSH_OWNER}/${DEST_REPO}.git"
git push --mirror
echo "    ✓ Push complete."

cd /
rm -rf "$TMPDIR"

echo ""
echo "==> Pronto! Veja o repo em:"
echo "    https://github.com/${PUSH_OWNER}/${DEST_REPO}"
