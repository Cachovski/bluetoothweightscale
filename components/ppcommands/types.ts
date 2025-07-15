// Types for PP Commands
export type CommandAction = "Write" | "Read";
export type COMPort = "COM 1" | "COM 2";
export type HelpModalType = "baudrate" | "databits" | "parity" | "stopbits";

export interface PPCommand {
  title: string;
  command: string;
  category: string;
}

export interface SendPPCommandParams {
  type: "baudrate-write" | "baudrate-read" | "databits-write" | "databits-read" | "parity-write" | "parity-read" | "stopbits-write" | "stopbits-read" | "raw";
  com?: COMPort;
  value?: number;
  rawCommand?: string;
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
