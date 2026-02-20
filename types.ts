
export interface Message {
  role: 'user' | 'model';
  text?: string;
  thought?: string;
  image?: string;
  isStreaming?: boolean;
  groundingSources?: GroundingSource[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}
