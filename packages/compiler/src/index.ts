export interface CompileResult { code: string; map?: string }

// Very small proof-of-concept compiler for .dribble component DSL
// Supports:
// - `export ephemeral Name() { render( ... ); }`
// - `export persistent Name(...) { render( ... ); }`
// - Razor-like @expressions within markup
// This produces a TS class extending a base runtime component with a render function call.

export function compileDribble(filename: string, source: string): CompileResult {
  const isPersistent = /export\s+persistent\s+([A-Za-z_][A-Za-z0-9_]*)/m.test(source);
  const header = source.match(/export\s+(ephemeral|persistent)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*{/m);
  if (!header || header.index == null) throw new Error(`Invalid component syntax in ${filename}`);
  const kind = header[1]!;
  const name = header[2]!;
  const params = header[3] ?? '';
  const bodyStart = header.index + header[0].length;
  const bodyEnd = source.lastIndexOf('}');
  if (bodyEnd < 0 || bodyEnd <= bodyStart) throw new Error(`Unterminated component body in ${filename}`);
  const body = source.slice(bodyStart, bodyEnd);

  // Extract render( ... ) content
  const renderCallIdx = body.indexOf('render(');
  if (renderCallIdx < 0) throw new Error(`Missing render() in ${filename}`);
  const prelude = body.slice(0, renderCallIdx).trim();
  const rm = body.slice(renderCallIdx).match(/render\s*\((([\s\S]*)?)\)\s*;?\s*$/m);
  if (!rm) throw new Error(`Malformed render() in ${filename}`);
  const renderInner = (rm[1] ?? '').trim();

  // Simple transform: convert JSX-like HTML with @expressions to template string with ${}
  const html = renderInner
    // remove surrounding newlines
    .replace(/^\s*\n|\n\s*$/g, '')
    // replace @if (...) { ... } with ${ (()=>{ if (...) { return "..." + (expr) + "..."; } return "" })() }
    .replace(/@if\s*\(([^)]+)\)\s*{([\s\S]*?)}/g, (_s, cond, inner) => {
      // Build a safe JS expression concatenating string chunks and identifiers
      const parts = inner.split(/@([A-Za-z_][A-Za-z0-9_]*)/g);
      const segments: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          // text chunk
          segments.push(JSON.stringify(parts[i] ?? ''));
        } else {
          // identifier name in parts[i]
          const id = parts[i]!.trim();
          segments.push(' + (' + id + ') + ');
        }
      }
      let joined = segments.join('');
      // Trim leading/ending concatenation operators
      joined = joined.replace(/^\s*\+\s*/, '').replace(/\s*\+\s*$/, '');
      return '${(() => { if (' + cond + ') { return ' + (joined || '""') + '; } return ""; })()}';
    })
    // replace @ident occurrences with ${ident} at top-level
    .replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, '${$1}')
    // ensure backticks don't break outer template
    .replace(/`/g, '\\`');

  const className = name;
  const baseClass = isPersistent ? 'PersistentComponent' : 'Component';

  // Params typing passthrough (very naive)
  const paramsDecl = params?.trim() ? params.trim() : '';

  const code = `
import { ${baseClass}, renderHtml } from '@dribble/runtime-client';

export class ${className} extends ${baseClass}<any> {
  // Capture constructor params (from component signature) as this.props
  props: any;
  constructor(props?: any) { super(); this.props = props; }
  async onInit(${paramsDecl}) { /* optional init hook */ }
  renderInitial(root: HTMLElement) {
    const params = this.props;
` + (prelude ? prelude + "\n" : '') + `    renderHtml(root, \
` + "`" + html + "`" + `);
  }
  onStateChange(_diff: any) {}
}
export default ${className};
`;

  return { code };
}
