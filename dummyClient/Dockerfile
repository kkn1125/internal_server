FROM node:lts

WORKDIR /home/

# node version setting
ENV NODE_VERSION=18.11.0
# install curl, apache2
RUN apt-get update && apt-get install -y curl unzip graphviz vim net-tools
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
# RUN curl -fsSL https://bun.sh/install | bash
RUN npm install -g npm@latest
RUN npm install -g cross-env nodemon dotenv vite pm2 concurrently sass madge
RUN node --version
RUN npm --version

COPY . .

RUN npm install

# RUN vite build --emptyOutDir

# RUN cp -r ./dist/* /var/www/html/

# EXPOSE 80

# CMD [ "/usr/sbin/apache2ctl", "-DFOREGROUND"]