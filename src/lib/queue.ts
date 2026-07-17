// Simple generic Queue data structure — used for attendance roll-call.
export class Queue<T> {
  private items: T[] = [];
  enqueue(item: T) { this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); }
  peek(): T | undefined { return this.items[0]; }
  get size() { return this.items.length; }
  get isEmpty() { return this.items.length === 0; }
  toArray(): T[] { return [...this.items]; }
  clear() { this.items = []; }
}
