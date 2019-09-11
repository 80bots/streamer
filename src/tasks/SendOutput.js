import config from '../config';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import fs from 'fs';

dayjs.extend(customParseFormat);

const EVENTS = {
  GET_OUTPUT: 'get_output',
  GET_FOLDERS: 'get_output_folders',
  GET_FULL_OUTPUT: 'get_full_output'
};

const MESSAGES = {
  OUTPUT: 'output',
  FOLDERS: 'output_folders',
  FULL: 'output_full'
};

class SendOutput {
  listeners = ({
    [EVENTS.GET_OUTPUT]: (query = {}) => this._getOutput(query),
    [EVENTS.GET_FOLDERS]: () => this._getFolders(),
    [EVENTS.GET_FULL_OUTPUT]: () => this._getFullOutput()
  });

  constructor(socket) {
    this.socket = socket;
    for (let event in this.listeners) {
      if(this.listeners.hasOwnProperty(event)) {
        socket.on(event, this.listeners[event]);
      }
    }
  }

  _getOutput({ folder }) {
    let arr = [];
    if(this.dates[folder]) {
      arr = this.dates[folder];
    }
    this.socket.emit(MESSAGES.OUTPUT, arr);
  }

  _parseOutput() {
    const output = JSON.parse(fs.readFileSync(config.app.outputFolder + 'output.json').toString());
    let dates = {};
    let folders = [];
    for (const date in output) {
      if(output.hasOwnProperty(date)) {
        let data = [];
        for (let dataKey in output[date]) {
          if(output[date].hasOwnProperty(dataKey)) {
            data.push({ dataKey, ...output[date][dataKey]});
          }
        }
        dates[date] = data;
        folders.push(date);
      }
    }
    this.dates = dates;
    return folders;
  }

  _getFolders() {
    try {
      this.socket.emit(MESSAGES.FOLDERS, this._parseOutput());
    } catch (e) {
      this.socket.emit(MESSAGES.FOLDERS, []);
    }
  }

  _getFullOutput() {
    if(!this.dates) this._parseOutput();
    return this.socket.emit(MESSAGES.FULL, this.dates);
  }
}

export default SendOutput;
