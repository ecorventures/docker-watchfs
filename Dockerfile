FROM mhart/alpine-node:4.3.2
MAINTAINER Corey Butler

ADD ./lib /app
WORKDIR /app

RUN npm install

CMD ["npm", "start"]
