import { Component } from './Component';

export abstract class PersistentComponent<TState = any> extends Component<TState> {}
