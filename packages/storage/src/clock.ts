export class LamportClock {
  private _value = 0;

  tick(): number {
    return ++this._value;
  }

  merge(remote: number): void {
    this._value = Math.max(this._value, remote) + 1;
  }

  get value(): number {
    return this._value;
  }
}
