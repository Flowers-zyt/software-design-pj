export class NumberValue {
  static parse(value: string, label = 'number'): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new Error(`invalid ${label}: ${value}`);
    }
    return this.finite(Number(value), label);
  }

  static finite(value: number, label = 'number'): number {
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
    return Object.is(value, -0) ? 0 : value;
  }

  static nonnegative(value: string, label: string): number {
    const result = this.parse(value, label);
    if (result < 0) throw new Error(`${label} must be non-negative`);
    return result;
  }

  static positive(value: string, label: string): number {
    const result = this.parse(value, label);
    if (result <= 0) throw new Error(`${label} must be positive`);
    return result;
  }

  static format(value: number): string { return String(this.finite(value)); }

  static count(args: readonly string[], min: number, max: number, usage: string): void {
    if (args.length < min || args.length > max) throw new Error(`usage: ${usage}`);
  }
}
