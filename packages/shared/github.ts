/** GitHub path components cannot be dot segments or introduce another URL path. */
export function validGithubRepo(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/.test(
    value,
  );
}
