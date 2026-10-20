import { NumberValue } from './NumberValue.js';

export abstract class Shape {
  private readonly idValue: string;
  private readonly styles = new Map<string, string>();
  private readonly imported = new Map<string, string>();

  protected constructor(id: string) {
    if (!id || /[\s\u0000-\u001f"'<>]/u.test(id)) throw new Error(`invalid id: ${id}`);
    this.idValue = id;
  }

  abstract get type(): string;
  get id(): string { return this.idValue; }
  get label(): string { return `${this.type}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get isContainer(): boolean { return false; }
  get text(): string | undefined { return undefined; }

  abstract geometry(): Readonly<Record<string, string>>;
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract summary(): string;
  protected abstract setGeometry(attribute: string, value: string): boolean;

  set(attribute: string, value: string): void {
    if (['fill', 'stroke', 'stroke-width'].includes(attribute)) {
      if (attribute === 'stroke-width') value = String(NumberValue.nonnegative(value, 'stroke-width'));
      if (!value.trim()) throw new Error(`${attribute} must not be empty`);
      this.styles.set(attribute, value);
      return;
    }
    if (!this.setGeometry(attribute, value)) throw new Error(`unknown attribute: ${attribute}`);
  }

  attributes(): Readonly<Record<string, string>> {
    return { id: this.id, ...Object.fromEntries(this.imported), ...this.geometry(), ...Object.fromEntries(this.styles) };
  }

  importAttributes(attributes: Readonly<Record<string, string>>): void {
    const geometry = this.geometry();
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'id' || key === 'transform' || Object.hasOwn(geometry, key)) continue;
      if (['fill', 'stroke', 'stroke-width'].includes(key)) this.set(key, value);
      else this.imported.set(key, value);
    }
  }

  protected styleSummary(): string {
    return [...this.styles].map(([key, value]) => `${key}=${value}`).join(' ');
  }

  protected withStyles(description: string): string {
    return [this.label, description, this.styleSummary()].filter(Boolean).join(' ');
  }

  position(): string { return this.summary(); }
}
