class Queue {
  constructor() {
    this.count = 0;
    this.storage = new ArrayBuffer(0);
    this.tmp;
    this.returnData = "";
  }

  enter(data) {
    if (this.count === 0) this.returnData = false;
    this.storage = this.joinArrayBuffer(data);
    this.count++;
  }

  get() {
    this.returnData = this.storage;
    this.storage = new ArrayBuffer(0);
    this.count = 0;
    return this.returnData;
  }

  joinArrayBuffer(data) {
    this.tmp = new Uint8Array(this.storage.byteLength + data.byteLength);
    this.tmp.set(new Uint8Array(this.storage), 0);
    this.tmp.set(new Uint8Array(data), this.storage.byteLength);
    return this.tmp;
  }
}

export default Queue;
