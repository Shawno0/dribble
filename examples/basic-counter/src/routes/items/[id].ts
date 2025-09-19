
import { PersistentComponent, renderHtml } from '@dribble/runtime-client';

export class Items extends PersistentComponent<any> {
  // Capture constructor params (from component signature) as this.props
  props: any;
  constructor(props?: any) { super(); this.props = props; }
  async onInit(params?: { id?: number }) { /* optional init hook */ }
  renderInitial(root: HTMLElement) {
    const params = this.props;
const itemId = params?.id ?? 0;
    renderHtml(root, `<div>${itemId}</div>
    ${(() => { if (itemId > 0) { return "\r\n      <span>Item " + (itemId) + "</span>\r\n    "; } return ""; })()}`);
  }
  onStateChange(_diff: any) {}
}
export default Items;
