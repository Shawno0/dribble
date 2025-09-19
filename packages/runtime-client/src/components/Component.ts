export type StateDiff<T = any> = unknown;

export abstract class Component<TState = any> {
  protected root!: HTMLElement;
  // Params and deps are left untyped for now; future versions will provide strong types
  onInit(_params?: any, _deps?: any): void | Promise<void> {}
  abstract renderInitial(root: HTMLElement): void;
  abstract onStateChange(diff: StateDiff<TState>): void;
  onMount(_root: HTMLElement): void {}
  onUnmount(): void {}
}
