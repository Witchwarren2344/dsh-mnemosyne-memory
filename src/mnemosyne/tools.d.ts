# Mnemosyne Plugin Type Declarations - Tools

export const MNEMOSYNE_TOOLS: string[];

export function registerMnemosyneTools(
  tools: any,
  plugin: any
): void;

export interface MnemoTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  output: {
    schema: Record<string, any>;
    render: (args: any, value: any) => any[];
  };
  execute: (args: any) => Promise<any>;
}
