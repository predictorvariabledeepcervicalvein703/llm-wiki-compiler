/**
 * ANSI colored terminal output helpers.
 * Provides consistent styling for compilation progress, status messages,
 * and streaming token display.
 */

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";

export function bold(text: string): string {
  return `${BOLD}${text}${RESET}`;
}

export function dim(text: string): string {
  return `${DIM}${text}${RESET}`;
}

export function success(text: string): string {
  return `${GREEN}${text}${RESET}`;
}

export function warn(text: string): string {
  return `${YELLOW}${text}${RESET}`;
}

export function info(text: string): string {
  return `${BLUE}${text}${RESET}`;
}

export function error(text: string): string {
  return `${RED}${text}${RESET}`;
}

export function concept(text: string): string {
  return `${MAGENTA}${BOLD}${text}${RESET}`;
}

export function source(text: string): string {
  return `${CYAN}${text}${RESET}`;
}

/** Print a status line with an icon. */
export function status(icon: string, message: string): void {
  console.log(`${icon} ${message}`);
}

/** Print a section header. */
export function header(title: string): void {
  console.log(`\n${BOLD}${title}${RESET}`);
  console.log(dim("─".repeat(Math.min(title.length + 4, 60))));
}
