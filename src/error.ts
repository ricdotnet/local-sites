export class Error {
  private readonly message: string;

  constructor(message: string) {
    this.message = message;
  }

  error() {
    return this.message;
  }
}
