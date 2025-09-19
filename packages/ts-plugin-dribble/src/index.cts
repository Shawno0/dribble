// Minimal TypeScript language service plugin to provide IntelliSense for .dribble files
// CommonJS tsserver plugin entry
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compileDribble } from '@dribble/compiler';

function create(info: any): any {
  const ts: any = info.typescript || (info.project && info.project.projectService && info.project.projectService.typescript);
  const { languageService, languageServiceHost, project } = info;
  try { info.project.projectService.logger.info('[dribble] plugin loaded'); } catch {}

  const dribbleExt = '.dribble';
  const origGetScriptFileNames = languageServiceHost.getScriptFileNames?.bind(languageServiceHost);
  const origGetScriptSnapshot = languageServiceHost.getScriptSnapshot.bind(languageServiceHost);
  const origGetScriptKind = languageServiceHost.getScriptKind?.bind(languageServiceHost);
  const origGetCompilationSettings = languageServiceHost.getCompilationSettings.bind(languageServiceHost);

  // Patch TS to parse compiled code for .dribble
  const tsAny = ts as any;
  const oldCreate = tsAny.createLanguageServiceSourceFile;
  const oldUpdate = tsAny.updateLanguageServiceSourceFile;
  tsAny.createLanguageServiceSourceFile = function (fileName: string, scriptSnapshot: any, languageVersion: any, setParentNodes: any, scriptKind: any, ...rest: any[]) {
    if (isDribble(fileName)) {
      try {
        const src = scriptSnapshot.getText(0, scriptSnapshot.getLength());
        const { code } = compileDribble(fileName, src);
        try { info.project.projectService.logger.info('[dribble] transform(create): ' + fileName); } catch {}
        const snap = tsAny.ScriptSnapshot.fromString(code);
        return oldCreate(fileName, snap, languageVersion, setParentNodes, tsAny.ScriptKind.TS, ...rest);
      } catch {
        // fall back to original to avoid hard crash
        try { info.project.projectService.logger.info('[dribble] transform(create) FAILED, falling back: ' + fileName); } catch {}
      }
    }
    return oldCreate(fileName, scriptSnapshot, languageVersion, setParentNodes, scriptKind, ...rest);
  };
  tsAny.updateLanguageServiceSourceFile = function (sourceFile: any, scriptSnapshot: any, version: any, textChangeRange: any, aggressiveChecks: any) {
    const fileName: string = sourceFile.fileName || sourceFile.path || '';
    if (isDribble(fileName)) {
      try {
        const src = scriptSnapshot.getText(0, scriptSnapshot.getLength());
        const { code } = compileDribble(fileName, src);
        try { info.project.projectService.logger.info('[dribble] transform(update): ' + fileName); } catch {}
        const snap = tsAny.ScriptSnapshot.fromString(code);
        return oldUpdate(sourceFile, snap, version, textChangeRange, aggressiveChecks);
      } catch {
        // fall back
        try { info.project.projectService.logger.info('[dribble] transform(update) FAILED, falling back: ' + fileName); } catch {}
      }
    }
    return oldUpdate(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks);
  };

  function isDribble(fileName: string) {
    return fileName.endsWith(dribbleExt);
  }

  // Allow non-ts extensions so TS will accept .dribble files in the program
  languageServiceHost.getCompilationSettings = () => {
    const s = origGetCompilationSettings();
    return { ...s, allowNonTsExtensions: true } as typeof s;
  };

  languageServiceHost.getScriptFileNames = () => {
    const names = origGetScriptFileNames ? origGetScriptFileNames() : [];
    const projectFiles = project.getFileNames ? project.getFileNames() : [];
    const extra = projectFiles.filter(isDribble);

    const rootFiles = new Set<string>([...names, ...extra]);
    if (![...rootFiles].some(isDribble)) {
      try {
        const configFile = project.getCompilerOptions()?.configFilePath as string | undefined;
        const baseDir = configFile ? dirname(configFile) : process.cwd();
        const srcDir = join(baseDir, 'src');
        const found: string[] = [];
        const walk = (dir: string) => {
          let entries: string[] = [];
          try { entries = readdirSync(dir); } catch { return; }
          for (const e of entries) {
            const p = join(dir, e);
            let st: any; try { st = statSync(p); } catch { continue; }
            if (st.isDirectory()) walk(p);
            else if (p.endsWith('.dribble')) found.push(p);
          }
        };
        walk(srcDir);
        for (const f of found) rootFiles.add(f);
      } catch {}
    }

    return Array.from(rootFiles);
  };

  languageServiceHost.getScriptKind = (fileName: string) => {
    if (isDribble(fileName)) {
      try { info.project.projectService.logger.info('[dribble] getScriptKind(TS): ' + fileName); } catch {}
      return ts.ScriptKind.TS;
    }
    return origGetScriptKind ? origGetScriptKind(fileName) : ts.ScriptKind.TS;
  };

  languageServiceHost.getScriptSnapshot = (fileName: string) => {
    if (!isDribble(fileName)) return origGetScriptSnapshot(fileName);
    try {
      const src = readFileSync(fileName, 'utf8');
      const { code } = compileDribble(fileName, src);
      try { info.project.projectService.logger.info('[dribble] getScriptSnapshot(compiled): ' + fileName); } catch {}
      return ts.ScriptSnapshot.fromString(code);
    } catch (e: any) {
      const msg = `/* dribble compile error: ${e?.message || e} */`;
      try { info.project.projectService.logger.info('[dribble] getScriptSnapshot(error): ' + fileName + ' -> ' + (e?.message || e)); } catch {}
      return ts.ScriptSnapshot.fromString(msg);
    }
  };

  const dribbleDiagFiles = (fileName: string) => fileName.endsWith(dribbleExt);

  const proxy: any = Object.create(null);
  for (const k of Object.keys(languageService) as any) {
    const x = languageService[k];
    // @ts-ignore
    proxy[k] = typeof x === 'function' ? x.bind(languageService) : x;
  }

  proxy.getSyntacticDiagnostics = (fileName: string) => {
    if (dribbleDiagFiles(fileName)) {
      try { info.project.projectService.logger.info('[dribble] suppress syntactic diagnostics: ' + fileName); } catch {}
      return [];
    }
    return languageService.getSyntacticDiagnostics(fileName);
  };
  proxy.getSemanticDiagnostics = (fileName: string) => {
    if (dribbleDiagFiles(fileName)) {
      try { info.project.projectService.logger.info('[dribble] suppress semantic diagnostics: ' + fileName); } catch {}
      return [] as any;
    }
    return languageService.getSemanticDiagnostics(fileName);
  };
  proxy.getSuggestionDiagnostics = (fileName: string) => {
    if (dribbleDiagFiles(fileName)) {
      try { info.project.projectService.logger.info('[dribble] suppress suggestion diagnostics: ' + fileName); } catch {}
      return [] as any;
    }
    return languageService.getSuggestionDiagnostics(fileName);
  };

  function readSource(fileName: string): string {
    try { return readFileSync(fileName, 'utf8'); } catch { return ''; }
  }

  function insideRender(source: string, pos: number): boolean {
    const before = source.slice(0, pos);
    const idx = before.lastIndexOf('render(');
    if (idx < 0) return false;
    // naive check for a closing ) after pos
    const after = source.slice(pos);
    return after.indexOf(')') >= 0;
  }

  function getWordAt(source: string, pos: number): { start: number; end: number; text: string } {
    let s = pos, e = pos;
    while (s > 0 && /[A-Za-z0-9_@]/.test(source[s-1]!)) s--;
    while (e < source.length && /[A-Za-z0-9_]/.test(source[e]!)) e++;
    const text = source.slice(s, e);
    return { start: s, end: e, text };
  }

  function collectParamsAndLocals(source: string): string[] {
    const names = new Set<string>();
    // params
    const header = source.match(/export\s+(?:ephemeral|persistent)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(([^)]*)\)\s*{/m);
    if (header) {
      const paramsSig = header[1] || '';
      // very naive: capture identifiers before ':' or ',' or ')'
      for (const m of paramsSig.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*[:,)\s]/g)) {
        names.add(m[1]!);
      }
    }
    // locals (const/let/function names)
    for (const m of source.matchAll(/\b(const|let)\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
      names.add(m[2]!);
    }
    return Array.from(names);
  }

  const htmlTags = [
    'div','span','h1','h2','h3','h4','h5','h6','p','a','ul','ol','li','button','input','label','form','section','article','header','main','footer','nav','img'
  ];
  const htmlAttrs = ['id','class','href','src','alt','title','type','value','name','placeholder','disabled','checked'];

  proxy.getCompletionsAtPosition = (fileName: string, position: number, options: any) => {
    if (!dribbleDiagFiles(fileName)) return languageService.getCompletionsAtPosition(fileName, position, options);
    const source = readSource(fileName);
    const { text } = getWordAt(source, position);
  const entries: any[] = [];
    const sort = (s: string) => s.padStart(3, '0');

    // DSL keywords
    for (const kw of ['ephemeral','persistent','render']) {
      entries.push({ name: kw, kind: ts.ScriptElementKind.keyword, sortText: sort('1') });
    }
    // @if snippet when inside render
    if (insideRender(source, position)) {
  // VS Code treats CompletionEntry with insertText/labelDetails as a snippet-like suggestion
  entries.push({ name: '@if', kind: ts.ScriptElementKind.keyword, sortText: sort('0'), insertText: '@if (${1:condition}) {\n  $0\n}' } as any);
      // HTML tags
      for (const t of htmlTags) entries.push({ name: `<${t}>`, kind: ts.ScriptElementKind.string, sortText: sort('2') });
      // Attributes (only show after a space or within a tag context is complex; always offer)
      for (const a of htmlAttrs) entries.push({ name: a, kind: ts.ScriptElementKind.memberVariableElement, sortText: sort('3') });
    }
    // @-ident variable suggestions
    if (text.startsWith('@')) {
      const names = collectParamsAndLocals(source);
      for (const n of names) entries.push({ name: '@' + n, kind: ts.ScriptElementKind.localVariableElement, sortText: sort('1') });
    }

    return { entries, isGlobalCompletion: false, isMemberCompletion: false, isNewIdentifierLocation: false } as any;
  };

  proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
    if (!dribbleDiagFiles(fileName)) return languageService.getQuickInfoAtPosition(fileName, position);
    const source = readSource(fileName);
    const { text } = getWordAt(source, position);
    const display = (s: string) => [{ text: s, kind: 'text' as const }];
    if (text === 'ephemeral') return { kind: ts.ScriptElementKind.keyword, kindModifiers: '', textSpan: { start: position, length: 9 }, displayParts: display('ephemeral component'), documentation: display('Client-only component with no persisted state') } as any;
    if (text === 'persistent') return { kind: ts.ScriptElementKind.keyword, kindModifiers: '', textSpan: { start: position, length: 10 }, displayParts: display('persistent component'), documentation: display('Stateful component synchronized with server') } as any;
    if (text === 'render') return { kind: ts.ScriptElementKind.functionElement, kindModifiers: '', textSpan: { start: position, length: 6 }, displayParts: display('render(htmlAndCode): void'), documentation: display('Render HTML with @-expressions for code') } as any;
    if (text.startsWith('@')) return { kind: ts.ScriptElementKind.localVariableElement, kindModifiers: '', textSpan: { start: position, length: text.length }, displayParts: display('dribble expression'), documentation: display('Evaluated inside render as an expression') } as any;
    return undefined;
  };

  return proxy;
}

function getExternalFiles(project: any): string[] {
  try {
    const configPath: string | undefined = project?.getCompilerOptions?.()?.configFilePath;
    const baseDir = configPath ? dirname(configPath) : project?.getCurrentDirectory?.() ?? process.cwd();
    const srcDir = join(baseDir, 'src');
    const out: string[] = [];
    const walk = (dir: string) => {
      let entries: string[] = [];
      try { entries = readdirSync(dir); } catch { return; }
      for (const e of entries) {
        const p = join(dir, e);
        let st: any; try { st = statSync(p); } catch { continue; }
        if (st.isDirectory()) walk(p);
        else if (p.endsWith('.dribble')) out.push(p);
      }
    };
    walk(srcDir);
    try { project.projectService.logger.info('[dribble] getExternalFiles: ' + out.length + ' files'); } catch {}
    return out;
  } catch {
    return [];
  }
}

const init = (modules: any) => {
  return { create, getExternalFiles, typescript: modules.typescript } as any;
};

export = init;
