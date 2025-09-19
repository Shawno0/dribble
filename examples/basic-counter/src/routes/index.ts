
import { Component, renderHtml } from '@dribble/runtime-client';

export class Home extends Component<any> {
  // Capture constructor params (from component signature) as this.props
  props: any;
  constructor(props?: any) { super(); this.props = props; }
  async onInit() { /* optional init hook */ }
  renderInitial(root: HTMLElement) {
    const params = this.props;
const title = 'Welcome to Dribble';
    renderHtml(root, `<header>
      <h1>${title}</h1>
    </header>
    <main>
      <p>Try navigating to /items/2</p>
    </main>
    <footer>
      <small>Client-rendered only</small>
    </footer>`);
  }
  onStateChange(_diff: any) {}
}
export default Home;
