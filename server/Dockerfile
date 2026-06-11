FROM node:22-alpine
WORKDIR /usr/src/app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm install --silent
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]