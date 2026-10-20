import { NumberValue } from './NumberValue.js';

export class Point {
  private xValue: number;
  private yValue: number;

  constructor(x: string, y: string) {
    this.xValue = NumberValue.parse(x);
    this.yValue = NumberValue.parse(y);
  }

  get x(): string { return NumberValue.format(this.xValue); }
  get y(): string { return NumberValue.format(this.yValue); }
  setX(value: string): void { this.xValue = NumberValue.parse(value); }
  setY(value: string): void { this.yValue = NumberValue.parse(value); }

  move(dx: number, dy: number): void {
    const x = NumberValue.finite(this.xValue + dx);
    const y = NumberValue.finite(this.yValue + dy);
    this.xValue = x;
    this.yValue = y;
  }

  scale(factor: number): void {
    const x = NumberValue.finite(this.xValue * factor);
    const y = NumberValue.finite(this.yValue * factor);
    this.xValue = x;
    this.yValue = y;
  }

  toString(): string { return `(${this.x},${this.y})`; }
}
