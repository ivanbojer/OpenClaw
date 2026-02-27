import { Signal } from "@/types";

export const signals: Signal[] = [
  {
    id: "sig-vix",
    label: "VIX",
    value: "19.1",
    trend: "down",
    detail: "Risk appetite stable; good window to ship."
  },
  {
    id: "sig-xau",
    label: "Gold",
    value: "$5,109",
    trend: "up",
    detail: "Momentum extended; watch for 2-4% snapbacks."
  },
  {
    id: "sig-gme",
    label: "GameStop chatter",
    value: "High",
    trend: "up",
    detail: "Ryan Cohen threads spiking—monitor morning brief."
  },
  {
    id: "sig-croatia",
    label: "Croatia desk",
    value: "Calm",
    trend: "flat",
    detail: "Infrastructure package vote slated for next week."
  }
];
