export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface DiffLine {
  lineNum: number;
  content: string;
  type: 'normal' | 'add' | 'remove';
  indent?: number;
}

export interface FileDiff {
  path: string;
  lines: DiffLine[];
}

export interface Thread {
  id: string;
  title: string;
  time: string;
  active?: boolean;
  status?: 'loading' | 'normal';
  meta?: string;
}

export interface Project {
  name: string;
  isOpen: boolean;
  threads: Thread[];
}
