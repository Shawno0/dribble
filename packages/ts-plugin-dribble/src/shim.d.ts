declare module '@dribble/compiler' {
  export function compileDribble(filename: string, source: string): { code: string; map?: string };
}
