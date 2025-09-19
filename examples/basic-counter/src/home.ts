
import { Component, renderHtml } from '@dribble/runtime-client';

export class Home extends Component<any> {
  // Capture constructor params (from component signature) as this.props
  props: any;
  constructor(props?: any) { super(); this.props = props; }
  async onInit() { /* optional init hook */ }
  renderInitial(root: HTMLElement) {
    const params = this.props;
    renderHtml(root, `<header>Dribble</header>
        <main>Hello Home</main>
        <footer>2025</footer>`);
  }
  onStateChange(_diff: any) {}
}
export default Home;
