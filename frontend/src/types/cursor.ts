export interface CursorSelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  line: number;
  column: number;
  color: string;
  timestamp: number;
  selection?: CursorSelectionRange;
}

export interface CursorPresence {
  [clientId: number]: CursorPosition;
}
