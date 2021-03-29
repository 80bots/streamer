![80bots data streamer](misc/80bots-beam-animated-3x-padding.gif)

# 80bots data streamer
## Overview:
A data streamer app is a small tool which helps to transfer data from the File System (FS) to S3 (Cold Storage) and streams FS updates using Socket.io.

There are some core tasks that are configured using an initial ENV file for describing only interesting files or directories to watch. 
The main tasks are located in the `{rootDir}/src/tasks` directory and they have a list of events and messages used for the FE interaction via [Socket.io](https://socket.io/ "Socket.io").
The tasks use the **storage** module and subscribe to storage updates. Each tasks has its own handlers for the specified storage signals.

The storage module depends on watchers types. The module itself initiates watching of the specified files and directories, handles these changes, parses them and calls the provided callbacks.
The storage module syncs the structure with S3 using specified timeouts. You can find these timeouts in the class' constructor of the `{rootDir}/src/services/storage.js` file.
### How to setup?
- Clone repo
- npm i -g yarn
- yarn

You can find node and npm\yarn version in `package.json`

### How to run the application?
Development:
- yarn dev

Production:
 - `yarn build`
or
 - `yarn start`

### Env file configuration:
`SOCKET_PORT` - configures the Socket.io server port

`SCREENSHOTS_FOLDER` - Path to the folder where the VNC's screenshots are located. Default path is `${HOME}/.screenshots`

`INIT_LOG_PATH` - Path to file of the Instance’s initial log file. The default path is `/var/log/cloud-init-output.log`

`OUTPUT_FOLDER` - Path to the folder containing the result of the Puppeteer work. Default path is `${HOME}/puppeteer/output/`

`LOG_PATH` - Path to Puppeteer’s log file. The default path is `${HOME}/puppeteer/logs/log.log`

`TIMESTAMP_FORMAT` - Date format string which is used for creating the Date object from screenshots name and preparing the folders structure emulation. Default: `YYYY-MM-DD-HH-mm-ss`

### TODOs:
1) Organize the realtime syncing with the S3
2) Organize the data flow in the way which will help us to avoid the creation of the odd watchers (It causes errors now)
3) Notify the main API about changes in the observable files or directories
4) Push updates to the FE via the single Echo Server.