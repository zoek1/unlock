FROM unlock-core

# Dependencies for unlock-protocol.com
RUN mkdir /home/unlock/unlock-protocol.com
COPY --chown=node unlock-protocol.com/package-lock.json /home/unlock/unlock-protocol.com/.
COPY --chown=node unlock-protocol.com/yarn.lock /home/unlock/unlock-protocol.com/.
COPY --chown=node unlock-protocol.com/package.json /home/unlock/unlock-protocol.com/.

# Build Unlock static site
WORKDIR /home/unlock/unlock-protocol.com
COPY --chown=node unlock-protocol.com/ /home/unlock/unlock-protocol.com/.
RUN yarn build
