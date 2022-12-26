FROM ubuntu:22.04

# node version setting
ENV NODE_VERSION=18.11.0
# install curl, apache2
RUN apt-get update && apt-get install -y curl apache2 unzip graphviz
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN curl -fsSL https://bun.sh/install | bash
RUN npm install -g npm@latest
RUN npm install -g cross-env nodemon dotenv vite pm2 concurrently sass madge
RUN node --version
RUN npm --version

COPY . .

RUN npm install

# EXPOSE 80

CMD ["npm","run","local"]