FROM node:lts

WORKDIR /app

# 安装 yarn
RUN curl -fsSL https://classic.yarnpkg.com/install.sh | bash && \
    export PATH="$HOME/.yarn/bin:$PATH"

# 安装常用的 npm 全局依赖
RUN yarn global add nodemon typescript ts-node eslint prettier jest @nestjs/cli rimraf cross-env concurrently @types/node

# 安装项目依赖
COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn install && yarn cache clean

# 安装字体 & fontconfig 工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-noto-cjk \
        fonts-wqy-microhei \
        fonts-wqy-zenhei \
        fonts-arphic-ukai \
        fonts-arphic-uming \
        fonts-liberation \
        fonts-dejavu \
        fonts-opensymbol \
        fonts-symbola \
        fonts-font-awesome \
        fonts-hack-ttf && \
    fc-cache -fv && \
    rm -rf /var/lib/apt/lists/*

# 复制源代码
COPY . .

# 构建项目
RUN yarn run build

# 暴露端口 3000
EXPOSE 3000

# 启动应用
CMD ["yarn", "start"]