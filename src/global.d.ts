// Global type declarations

declare global {
  declare module "express-session" {
    interface SessionData {
      flash: any; //TODO: Make this sensible
    }
  }
}
