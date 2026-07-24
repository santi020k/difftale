export class Uri {
  public readonly fsPath: string
  public readonly path: string
  public readonly query: string
  public readonly scheme: string

  public constructor(components: {
    fsPath?: string
    path: string
    query?: string
    scheme: string
  }) {
    this.fsPath = components.fsPath ?? components.path
    this.path = components.path
    this.query = components.query ?? ''
    this.scheme = components.scheme
  }

  public static file = (filePath: string): Uri =>
    new Uri({
      fsPath: filePath,
      path: filePath,
      scheme: 'file',
    })

  public static from = (components: {
    path: string
    query?: string
    scheme: string
  }): Uri => new Uri(components)
}
