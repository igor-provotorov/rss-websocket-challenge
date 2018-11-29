import Message from './message';

class WebSocketApp {
  constructor(url) {
    this.step = 0;
    this.connected = false;

    this.url = url;
    this.websocket = new WebSocket(this.url);
    this.websocket.binaryType = 'arraybuffer';
    this.websocket.onmessage = event => this._processIncome(event);
    this.websocket.onopen = () => this._ready();
  }

  start(name) {
    this.message = new Message(name);

    if (this.connected) {
      this.websocket.send(JSON.stringify({ name, command: 'challenge accepted' }));
    } else {
      console.log('Loading');
      setTimeout(() => this.start(name), 5000);
    }
  }

  _ready() {
    this.connected = true;
  }

  _processIncome(event) {
    if (typeof event.data === 'string') {
      this._processTextData(JSON.parse(event.data));
    } else if (typeof event.data === 'object') {
      this._processBinaryData(event.data);
    } else {
      console.log('Message data format!');
    }
  }

  _processTextData(data) {
    if (data['token']) {
      this.message.authToken = data['token'];
    }
    if (data['next']) {
      this.message.command = data['next'];
      this.websocket.send(JSON.stringify({ "token": this.message.authToken, "command": this.message.command }));
    }

    if (data['name'] === 'arithmetic') {
      this._performArithmetic(data['task']);
    }

    if (data['name'] === 'function_evaluation') {
      const result = eval(data['task'].fn)();
      this.websocket.send(JSON.stringify({ "token": this.message.authToken, "command": data['name'], "answer": result }));
    }

    if (data['name'] === 'binary_arithmetic') {
      this.message.bit = data['task'].bits;
    }

    if (data['name'] === 'win'){
      this.websocket.send(JSON.stringify({ "token": this.message.authToken, "command": data['name']}));
    }

    if (data['secretCode']) {
      console.log(`WIN: ${data['secretCode']}`);
      this.websocket.close();
    }
  }

  _performArithmetic(data) {
    const sign = data['sign'];
    const result = data['values'].reduce((acc, val) => eval(`${acc} ${sign} ${val}`));
    this.websocket.send(JSON.stringify({ "token": this.message.authToken, "command": "arithmetic", "answer": result }));
  }

  _processBinaryData(buffer) {
    let ul;
    if(this.message.bit == 16) {
      ul = new Uint16Array(buffer);
    } else {
      ul = new Uint8Array(buffer);
    }

    const result = ul.reduce((acc, val) => acc + val);
    this.websocket.send(JSON.stringify({ "token": this.message.authToken, "command": "binary_arithmetic", "answer": result }));
  }
}

export default WebSocketApp;
