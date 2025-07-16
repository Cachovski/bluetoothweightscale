// Types for PP Commands
export type CommandAction = "Write" | "Read";
export type COMPort = "COM 1" | "COM 2";
export type HelpModalType = "baudrate" | "databits" | "parity" | "stopbits" | "protocol" | "brightness-duration" | "brightness-intensity" | "brightness-minweight" | "kg-symbol";
export type FrameType = "P" | "T" | "R" | "A" | "Z" | "J";

export interface PPCommand {
  title: string;
  command: string;
  category: string;
}

export interface SendPPCommandParams {
  type: "baudrate-write" | "baudrate-read" | "databits-write" | "databits-read" | "parity-write" | "parity-read" | "stopbits-write" | "stopbits-read" | "protocol-write" | "protocol-read" | "frame-write" | "frame-read" | "brightness-duration-write" | "brightness-duration-read" | "brightness-intensity-write" | "brightness-intensity-read" | "brightness-minweight-write" | "brightness-minweight-read" | "kg-symbol-write" | "buzzer-right-sound" | "buzzer-error-sound" | "raw";
  com?: COMPort;
  value?: number;
  rawCommand?: string;
  frameType?: FrameType;
}

export interface FrameState {
  [key: string]: {
    [K in COMPort]: boolean | null; // null means unknown/not read yet
  };
}

export interface CommandModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (action: CommandAction, value?: string) => Promise<void>;
  title: string;
  valueRange: string;
  validationPattern: RegExp;
  helpModalType: HelpModalType;
  onShowHelp: (type: HelpModalType) => void;
}
