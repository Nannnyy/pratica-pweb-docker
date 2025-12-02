#!/bin/sh
# Script de entrada para Redis que lê a senha do ambiente
# Se REDIS_PASSWORD não estiver definido, usa uma senha padrão

if [ -z "$REDIS_PASSWORD" ]; then
  echo "Aviso: REDIS_PASSWORD não definido, usando senha padrão"
  REDIS_PASSWORD="default_redis_password"
fi

exec redis-server --appendonly yes --requirepass "$REDIS_PASSWORD"

