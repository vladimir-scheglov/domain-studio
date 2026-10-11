import { create } from "zustand";

type DiffState = {
  open: boolean;
  leftYaml: string;
  leftLabel: string;
  rightYaml: string;
  rightLabel: string;
  show: (opts: {
    leftYaml: string;
    leftLabel: string;
    rightYaml: string;
    rightLabel: string;
  }) => void;
  close: () => void;
};

export const useDiffStore = create<DiffState>((set) => ({
  open: false,
  leftYaml: "",
  leftLabel: "",
  rightYaml: "",
  rightLabel: "",
  show: ({ leftYaml, leftLabel, rightYaml, rightLabel }) =>
    set({ open: true, leftYaml, leftLabel, rightYaml, rightLabel }),
  close: () => set({ open: false }),
}));
