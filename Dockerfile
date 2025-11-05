FROM node:lts@sha256:55b6bbed4323ccaf9287d7e0578bf0af393bd2c9521f6fb99e0b3ce2b00d914b

WORKDIR /app

# 安装 yarn
RUN curl -fsSL https://classic.yarnpkg.com/install.sh | bash
ENV PATH="/root/.yarn/bin:$PATH"

# 安装项目依赖
COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn install && yarn cache clean

# 安装字体 & fontconfig 工具
RUN apt-get update && \
    apt-get install -y curl wget

# 复制源代码
COPY . .

# 构建项目
RUN yarn run build

# 暴露端口 3000
EXPOSE 3000

# 启动应用
CMD ["yarn", "start"]