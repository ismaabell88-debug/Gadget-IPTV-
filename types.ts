export interface Channel {
  id: string;
  name: string;
  group: string;
  logo?: string;
  url: string;
}

export type DecoderStatus = 'idle' | 'loading' | 'active' | 'error';

export interface VideoPlayerProps {
  src: string | undefined;
  volume: number;
  isPowerOn: boolean;
  channelInfo: (Channel & { index: number }) | null;
  showInfoBanner: boolean;
  onRetry: () => void;
}

export interface DecoderBoxProps {
  onImport: (content: string, isUrl: boolean) => void;
  onLoadDemo: () => void;
  status: DecoderStatus;
  channelCount: number;
  currentChannelIndex: number;
}
