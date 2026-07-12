# Imagem base leve do Nginx para servir arquivos estáticos
FROM nginx:alpine

# Copiar todos os arquivos estáticos do projeto para a pasta padrão do Nginx
COPY . /usr/share/nginx/html

# Expor a porta 80 padrão do Nginx
EXPOSE 80

# Iniciar o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]
