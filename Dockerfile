# Lightweight Nginx base image to serve static files
FROM nginx:alpine

# Copy all static files of the project to the default Nginx folder
COPY . /usr/share/nginx/html

# Expose the default Nginx port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
